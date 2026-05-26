<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { J, KEYS, today } from '$lib/data/storage';
	import { getWeek, getDay, getRoutineDay } from '$lib/data/program';

	let { children } = $props();

	let greeting    = $state('');
	let profileName = $state('');
	let week        = $state(1);
	let day         = $state(1);
	let doneSets    = $state(0);
	let totalSets   = $state(0);

	// ── AI Coach Chat ─────────────────────────────────────────
	const AI_PROXY  = 'https://vasbyt-ai-proxy.clover887.workers.dev';
	const AI_MODEL  = 'google/gemini-3-flash-preview';

	interface ChatMsg { role: 'user' | 'coach'; text: string; }
	let chatOpen    = $state(false);
	let chatMsgs    = $state<ChatMsg[]>([]);
	let chatInput   = $state('');
	let chatLoading = $state(false);
	let chatEl      = $state<HTMLElement | null>(null);

	$effect(() => {
		if (chatMsgs.length > 0 && chatEl) {
			setTimeout(() => { chatEl!.scrollTop = chatEl!.scrollHeight; }, 40);
		}
	});

	function buildChatContext(): string {
		const logs = J<{ date: string; exerciseName: string; weight: string; reps: string }[]>(KEYS.logs(), []);
		const todayLogs = logs.filter(l => l.date === today());
		const checkins  = J<{ date: string; energy?: number; weight?: number; sleep?: number }[]>(KEYS.checkins(), []);
		const lastCI    = checkins[checkins.length - 1];
		const rd        = getRoutineDay(day);
		const lines = [
			`Athlete: ${profileName || 'athlete'}`,
			`Program: Week ${week}, Day ${day}`,
			`Today's exercises: ${rd.exercises.map((e: { name: string }) => e.name).join(', ') || 'rest day'}`,
			`Sets done today: ${doneSets}/${totalSets}`,
		];
		if (lastCI) lines.push(`Last check-in: energy ${lastCI.energy ?? '—'}/10, weight ${lastCI.weight ?? '—'} kg, sleep ${lastCI.sleep ?? '—'}/10`);
		if (todayLogs.length > 0) lines.push(`Today so far: ${todayLogs.map(l => `${l.exerciseName} ${l.weight}kg×${l.reps}`).join(' · ')}`);
		return lines.join('\n');
	}

	function sysPrompt(): string {
		return `You are a warm, encouraging personal trainer inside a workout app called Vasbyt. Keep replies short — 2-3 sentences max. Casual tone. No markdown, no bullet points, no greetings. Just natural conversation.\n\nContext:\n${buildChatContext()}`;
	}

	async function openChat() {
		chatOpen = true;
		if (chatMsgs.length === 0) {
			chatLoading = true;
			try {
				const resp = await fetch(AI_PROXY, {
					method: 'POST', headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ model: AI_MODEL, max_tokens: 100,
						messages: [{ role: 'system', content: sysPrompt() }, { role: 'user', content: 'Hey coach!' }] })
				});
				const data = await resp.json();
				const txt = data?.choices?.[0]?.message?.content?.trim();
				if (txt) chatMsgs = [{ role: 'coach', text: txt }];
			} catch { /* silent */ } finally { chatLoading = false; }
		}
	}

	async function sendMsg() {
		const txt = chatInput.trim();
		if (!txt || chatLoading) return;
		chatInput = '';
		chatMsgs = [...chatMsgs, { role: 'user', text: txt }];
		chatLoading = true;
		try {
			const history = chatMsgs.slice(-10).map(m => ({
				role: m.role === 'user' ? 'user' : 'assistant', content: m.text
			}));
			const resp = await fetch(AI_PROXY, {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ model: AI_MODEL, max_tokens: 160,
					messages: [{ role: 'system', content: sysPrompt() }, ...history] })
			});
			const data = await resp.json();
			const reply = data?.choices?.[0]?.message?.content?.trim();
			if (reply) chatMsgs = [...chatMsgs, { role: 'coach', text: reply }];
		} catch {
			chatMsgs = [...chatMsgs, { role: 'coach', text: 'Connection issue — try again in a sec.' }];
		} finally { chatLoading = false; }
	}

	function chatKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
	}

	const tabs = [
		{ href: '/',      label: 'Today'       },
		{ href: '/stats', label: 'My Progress' },
		{ href: '/body',  label: 'My Body'     },
		{ href: '/cardio', label: 'Cardio'       },
	];

	const isGym = $derived($page.url.pathname === '/gym');

	onMount(() => {
		const t = J<string>(KEYS.theme(), '');
		document.documentElement.dataset.theme = t;

		const h = new Date().getHours();
		greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
		const profile = J<{ name?: string }>(KEYS.profile(), {});
		profileName = profile.name || '';

		week = getWeek();
		day  = getDay();

		const allLogs = J<{ date: string }[]>(KEYS.logs(), []);
		doneSets  = allLogs.filter(l => l.date === today()).length;
		totalSets = getRoutineDay(day).exercises.reduce((s, ex) => s + ex.sets, 0);
	});
</script>

{#if !isGym}
	<header class="hero">
		<div class="hero-left">
			<h1>Vasbyt<span class="you-can">· You Can!</span></h1>
			{#if profileName}
				<div class="hero-greeting">{greeting}, {profileName}</div>
			{/if}
		</div>
		<div class="hero-right">
			<a href="/settings" class="ghost-btn" aria-label="Settings">⚙</a>
			<div class="pill">W{week} · D{day} · {doneSets}/{totalSets}</div>
		</div>
	</header>

	<nav class="tabs">
		{#each tabs as tab}
			<a
				href={tab.href}
				class="tab"
				class:active={$page.url.pathname === tab.href}
			>{tab.label}</a>
		{/each}
	</nav>

	<!-- ── AI Coach FAB ─────────────────────────────────────── -->
	<button type="button" class="fab" onclick={openChat} aria-label="AI Coach">AI</button>

	<!-- Chat drawer -->
	{#if chatOpen}
		<div class="chat-backdrop" onclick={() => (chatOpen = false)}></div>
		<div class="chat-drawer">
			<div class="chat-hdr">
				<span class="chat-title">AI Coach</span>
				<button type="button" class="chat-close" onclick={() => (chatOpen = false)}>×</button>
			</div>
			<div class="chat-msgs" bind:this={chatEl}>
				{#if chatLoading && chatMsgs.length === 0}
					<div class="chat-thinking">···</div>
				{/if}
				{#each chatMsgs as msg}
					<div class="chat-msg" class:msg-user={msg.role === 'user'} class:msg-coach={msg.role === 'coach'}>{msg.text}</div>
				{/each}
				{#if chatLoading && chatMsgs.length > 0}
					<div class="chat-msg msg-coach chat-thinking">···</div>
				{/if}
			</div>
			<div class="chat-input-row">
				<input type="text" class="chat-input" placeholder="Ask your coach..." bind:value={chatInput} onkeydown={chatKey} disabled={chatLoading} />
				<button type="button" class="chat-send" onclick={sendMsg} disabled={chatLoading || !chatInput.trim()}>↑</button>
			</div>
		</div>
	{/if}
{/if}

<main class:gym-shell={isGym}>
	{@render children()}
</main>

<style>
	.hero {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		align-items: flex-start;
		padding: 12px 4px 10px;
		max-width: 760px;
		margin: 0 auto;
	}

	.hero-left h1 {
		margin: 0;
		font-size: clamp(26px, 7vw, 40px);
		line-height: 1;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.you-can {
		font-size: 0.6em;
		font-weight: 800;
		color: var(--accent);
		letter-spacing: 0.03em;
		text-shadow: 0 0 14px var(--accent), 0 0 28px var(--accent-glow);
	}

	.hero-greeting {
		font-size: 13px;
		color: var(--muted);
		margin-top: 1px;
	}

	.hero-right {
		display: grid;
		gap: 7px;
		justify-items: end;
		flex-shrink: 0;
	}

	.ghost-btn {
		background: none;
		border: none;
		color: var(--muted);
		font-size: 22px;
		min-height: 44px;
		width: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		text-decoration: none;
		border-radius: 10px;
		transition: color 0.15s;
	}
	.ghost-btn:hover { color: var(--accent); }

	.pill {
		white-space: nowrap;
		background: rgba(255, 255, 255, .09);
		border: 1px solid var(--line);
		color: var(--muted);
		border-radius: 999px;
		padding: 7px 9px;
		font-size: 12px;
		font-weight: 800;
	}

	.tabs {
		position: sticky;
		top: 0;
		z-index: 10;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 7px;
		padding: 8px 0;
		backdrop-filter: blur(14px);
		background: var(--tabs-bg);
		max-width: 760px;
		margin: 0 auto;
	}

	.tab {
		border: 1px solid var(--line);
		color: var(--text);
		background: rgba(255, 255, 255, .08);
		border-radius: 13px;
		padding: 10px 8px;
		min-height: 44px;
		font-weight: 900;
		font-size: 14px;
		text-decoration: none;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		transition: background 0.15s, border-color 0.15s;
	}

	.tab.active {
		background: linear-gradient(135deg, var(--accent), var(--accent-light));
		color: var(--accent-text);
		border-color: transparent;
	}

	.tab:hover:not(.active) {
		border-color: var(--border-strong);
		background: rgba(255, 255, 255, .12);
	}

	main {
		max-width: 760px;
		margin: 0 auto;
		padding-bottom: 12px;
	}

	main.gym-shell {
		max-width: 100%;
		padding-bottom: 0;
	}

	/* ── AI Coach FAB ── */
	.fab {
		position: fixed;
		bottom: 24px;
		right: 16px;
		z-index: 50;
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--accent), var(--accent-light));
		color: var(--accent-text);
		border: none;
		font-size: 12px;
		font-weight: 900;
		letter-spacing: 0.04em;
		cursor: pointer;
		box-shadow: 0 4px 20px rgba(0, 188, 212, 0.4);
		transition: transform 0.15s, box-shadow 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.fab:hover { transform: scale(1.06); box-shadow: 0 6px 24px rgba(0, 188, 212, 0.55); }
	.fab:active { transform: scale(0.96); }

	.chat-backdrop {
		position: fixed;
		inset: 0;
		z-index: 55;
		background: rgba(0, 0, 0, 0.45);
	}

	.chat-drawer {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 60;
		height: 65vh;
		max-height: 520px;
		background: var(--card);
		border-top: 1px solid var(--line);
		border-radius: 20px 20px 0 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: slideUp 0.22s ease-out;
	}
	@keyframes slideUp {
		from { transform: translateY(100%); }
		to   { transform: translateY(0); }
	}

	.chat-hdr {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px 12px;
		border-bottom: 1px solid var(--line);
		flex-shrink: 0;
	}
	.chat-title { font-size: 15px; font-weight: 800; color: var(--accent); }
	.chat-close {
		background: none; border: none; cursor: pointer;
		font-size: 22px; color: rgba(255,255,255,.4);
		line-height: 1; padding: 0 4px;
	}
	.chat-close:hover { color: rgba(255,255,255,.7); }

	.chat-msgs {
		flex: 1;
		overflow-y: auto;
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.chat-msg {
		max-width: 84%;
		padding: 9px 13px;
		border-radius: 16px;
		font-size: 14px;
		line-height: 1.45;
	}
	.msg-coach {
		align-self: flex-start;
		background: rgba(255,255,255,.08);
		border: 1px solid var(--line);
		color: var(--text);
		border-radius: 4px 16px 16px 16px;
	}
	.msg-user {
		align-self: flex-end;
		background: linear-gradient(135deg, var(--accent), var(--accent-light));
		color: var(--accent-text);
		font-weight: 600;
		border-radius: 16px 4px 16px 16px;
	}
	.chat-thinking {
		letter-spacing: 0.15em;
		font-size: 16px;
		color: var(--muted);
	}

	.chat-input-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		border-top: 1px solid var(--line);
		flex-shrink: 0;
	}
	.chat-input {
		flex: 1;
		background: rgba(255,255,255,.07);
		border: 1px solid var(--line);
		border-radius: 22px;
		color: var(--text);
		font-size: 14px;
		padding: 10px 16px;
		outline: none;
		min-height: 44px;
	}
	.chat-input:focus { border-color: var(--accent); }
	.chat-input::placeholder { color: var(--muted); }
	.chat-input:disabled { opacity: 0.5; }
	.chat-send {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--accent), var(--accent-light));
		color: var(--accent-text);
		border: none;
		font-size: 18px;
		font-weight: 700;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: opacity 0.15s;
	}
	.chat-send:disabled { opacity: 0.35; cursor: default; }
</style>
