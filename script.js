$(function () {
	$("#current-year").text(new Date().getFullYear());
	const inputDateStr = "09-JUL-2022";

	function parseDateDDMMMYYYY(s) {
		if (!s || typeof s !== 'string') return new Date(NaN);
		const parts = s.split('-');
		if (parts.length !== 3) return new Date(NaN);
		const day = parseInt(parts[0], 10);
		const monStr = parts[1].toUpperCase();
		const year = parseInt(parts[2], 10);
		const monthsMap = {
			JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
			JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
		};
		const m = monthsMap[monStr.slice(0, 3)];
		if (isNaN(day) || isNaN(year) || m === undefined) return new Date(NaN);
		return new Date(year, m, day);
	}

	const prevDate = parseDateDDMMMYYYY(inputDateStr);
	const currentDate = new Date();

	if (isNaN(prevDate.getTime())) {		
		$(".year").text("experience: unknown");
		return;
	}

	let years = currentDate.getFullYear() - prevDate.getFullYear();
	let months = currentDate.getMonth() - prevDate.getMonth();
	const days = currentDate.getDate() - prevDate.getDate();

	if (days < 0) {
		months -= 1;
	}

	if (months < 0) {
		years -= 1;
		months += 12;
	}

	const yearLabel = years === 1 ? 'year' : 'years';
	const monthLabel = months === 1 ? 'month' : 'months';
	const text = `${years} ${yearLabel} and ${months} ${monthLabel}`;

	$(".year").text(text);

	// --- GitHub repos: fetch and render public repositories ---

	async function fetchAndRenderGithubRepos(username, max = 6) {
		const $container = $("#github-repos");
		if ($container.length === 0) return;
		$container.html('<p style="text-align:center;">Loading repositories...</p>');

		// Try to read cached value from localStorage (TTL: 1 hour)
		const cacheKey = `gh_repos_${username}`;
		const TTL = 1000 * 60 * 60; // 1 hour
		try {
			const raw = localStorage.getItem(cacheKey);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (parsed && parsed.ts && Date.now() - parsed.ts < TTL && Array.isArray(parsed.repos)) {
					renderRepos(parsed.repos.slice(0, max), $container);
					return;
				}
			}
		} catch (e) {
			// ignore localStorage errors (e.g., private mode)
			console.warn('LocalStorage not available for GitHub cache', e);
		}

		const endpoint = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=${max}`;
		try {
			const resp = await fetch(endpoint, { headers: { Accept: 'application/vnd.github.v3+json' } });
			if (!resp.ok) {
				const body = await resp.json().catch(() => ({}));
				if (resp.status === 404) {
					$container.html('<p style="text-align:center;color:#c00;">GitHub user not found.</p>');
					return;
				}
				if (body && body.message && body.message.toLowerCase().includes('rate limit')) {
					$container.html('<p style="text-align:center;color:#c00;">GitHub API rate limit exceeded. Try again later.</p>');
					return;
				}
				$container.html('<p style="text-align:center;color:#c00;">Failed to load repositories.</p>');
				return;
			}

			const repos = await resp.json();
			if (!Array.isArray(repos) || repos.length === 0) {
				$container.html('<p style="text-align:center;">No public repositories found.</p>');
				return;
			}

			// cache the result
			try {
				localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), repos }));
			} catch (e) {
				// ignore storage errors
			}

			renderRepos(repos.slice(0, max), $container);
		} catch (err) {
			$container.html('<p style="text-align:center;color:#c00;">Error loading repositories.</p>');
			console.error('Error fetching GitHub repos:', err);
		}
	}

	// Helper to render repos into the container
	function renderRepos(repos, $container) {
		const $list = $('<div class="github-list"></div>');
		repos.forEach(repo => {
			const name = repo.name || 'repo';
			const desc = repo.description ? $('<p class="repo-desc"></p>').text(repo.description) : '';
			const link = $('<a target="_blank" rel="noopener noreferrer"></a>').attr('href', repo.html_url).text(name);
			const stars = repo.stargazers_count ? `• ★ ${repo.stargazers_count}` : '';
			const language = repo.language ? (repo.language) : '';
			const updated = repo.updated_at ? ` • updated ${timeAgo(new Date(repo.updated_at))}` : '';
			const metaText = [language, stars].filter(Boolean).join(' ')+ (updated || '');
			const meta = $('<div class="repo-meta"></div>').text(metaText.trim());
			const $card = $('<div class="repo-card"></div>');
			$card.append($('<h4></h4>').append(link));
			if (desc) $card.append(desc);
			$card.append(meta);
			$list.append($card);
		});
		$container.empty().append($list);
	}

	// simple human-friendly time-ago helper
	function timeAgo(d) {
		const sec = Math.floor((Date.now() - d.getTime()) / 1000);
		if (sec < 60) return `${sec}s`;
		const min = Math.floor(sec / 60);
		if (min < 60) return `${min}m`;
		const hr = Math.floor(min / 60);
		if (hr < 24) return `${hr}h`;
		const days = Math.floor(hr / 24);
		if (days < 30) return `${days}d`;
		const months = Math.floor(days / 30);
		if (months < 12) return `${months}mo`;
		const years = Math.floor(months / 12);
		return `${years}y`;
	}

	// Read username and max from the #github section's data attributes (fallbacks)
	const githubSection = document.querySelector('#github');
	if (githubSection) {
		const username = githubSection.getAttribute('data-github-username') || 'gowrims';
		const maxAttr = parseInt(githubSection.getAttribute('data-github-max'), 10);
		const max = isNaN(maxAttr) ? 8 : Math.max(1, Math.min(50, maxAttr));
		fetchAndRenderGithubRepos(username, max);
	}
});
