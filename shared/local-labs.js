(function loadLocalLabs() {
	"use strict";

	const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
	if (!loopbackHosts.has(window.location.hostname)) {
		return;
	}

	function readLab(entry) {
		if (!entry || typeof entry !== "object") {
			return undefined;
		}

		const fields = ["title", "kicker", "summary", "url", "displayNumber"];
		if (fields.some((field) => typeof entry[field] !== "string" || !entry[field].trim())) {
			return undefined;
		}

		const url = new URL(entry.url, window.location.origin);
		if (url.origin !== window.location.origin || !url.pathname.startsWith("/lab/")) {
			return undefined;
		}

		return {
			title: entry.title.trim(),
			kicker: entry.kicker.trim(),
			summary: entry.summary.trim(),
			url: `${url.pathname}${url.search}${url.hash}`,
			displayNumber: entry.displayNumber.trim()
		};
	}

	function createCard(lab) {
		const card = document.createElement("a");
		card.className = "post-card";
		card.dataset.number = lab.displayNumber;
		card.href = lab.url;

		const kicker = document.createElement("span");
		kicker.className = "post-card-kicker";
		kicker.textContent = lab.kicker;

		const copy = document.createElement("span");
		const title = document.createElement("span");
		title.className = "post-card-title";
		title.textContent = lab.title;
		const summary = document.createElement("span");
		summary.className = "post-card-meta";
		summary.textContent = lab.summary;
		copy.append(title, summary);

		card.append(kicker, copy);
		return card;
	}

	function renderLocalLabs() {
		const section = document.querySelector("#local-labs");
		const grid = section?.querySelector("[data-local-lab-grid]");
		if (!section || !grid) {
			return;
		}

		fetch("/lab/labs.json", { cache: "no-store" })
			.then((response) => {
				if (!response.ok) {
					throw new Error(`Lab manifest request failed with ${response.status}.`);
				}
				return response.json();
			})
			.then((entries) => {
				if (!Array.isArray(entries)) {
					return;
				}

				const labs = entries.map(readLab).filter(Boolean);
				if (!labs.length) {
					return;
				}

				grid.style.setProperty("--local-lab-columns", Math.min(labs.length, 3));
				grid.replaceChildren(...labs.map(createCard));
				section.hidden = false;
			})
			.catch(() => {
				section.hidden = true;
			});
	}

	const options = window.markdeepOptions || {};
	const previousOnLoad = options.onLoad;
	options.onLoad = function showLocalLabs() {
		if (typeof previousOnLoad === "function") {
			previousOnLoad();
		}

		renderLocalLabs();
	};
	window.markdeepOptions = options;
})();
