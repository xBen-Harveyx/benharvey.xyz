// Blog page: category tabs over the posts.
// Post pages: a table of contents, "Listen to article", and "Share".
// Each part checks that its elements exist, so one file serves both pages.

/* ---------- blog ---------- */
const grid = document.getElementById("posts");

if (grid) {
  const posts = [...grid.children];
  const tabs = document.querySelector(".tabs");

  // One tab per category, in the order they first appear in the list.
  const names = ["All", ...new Set(posts.map((p) => p.dataset.category).filter(Boolean))];
  tabs.replaceChildren(...names.map((name) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "tab";
    tab.textContent = name;
    tab.setAttribute("aria-pressed", name === "All");
    tab.addEventListener("click", () => {
      tabs.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-pressed", t === tab));
      posts.forEach((post) => { post.hidden = name !== "All" && post.dataset.category !== name; });
    });
    return tab;
  }));

  // The tabs only work with JS, so they stay hidden without it, and while
  // there's nothing to sort.
  tabs.hidden = posts.length === 0;
}

/* ---------- post pages ---------- */
const article = document.querySelector(".article-body");

if (article) {
  // Table of contents from the post's headings, highlighting the section
  // being read. Short posts with fewer than two headings don't get one.
  const toc = document.querySelector(".toc");
  const headings = [...article.querySelectorAll("h2, h3")];

  if (toc && headings.length > 1) {
    const links = headings.map((h) => {
      if (!h.id) h.id = h.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const a = document.createElement("a");
      a.href = `#${h.id}`;
      a.textContent = h.textContent;
      if (h.tagName === "H3") a.className = "sub";
      return a;
    });
    toc.append(...links);
    toc.hidden = false;

    const mark = () => {
      const line = innerHeight * 0.3;
      let current = 0;
      headings.forEach((h, i) => { if (h.getBoundingClientRect().top < line) current = i; });
      links.forEach((a, i) => a.classList.toggle("is-active", i === current));
    };
    addEventListener("scroll", mark, { passive: true });
    mark();
  }

  // Listen to article: the browser's own text-to-speech.
  const listen = document.querySelector(".listen");
  if (listen && "speechSynthesis" in window) {
    const label = listen.querySelector(".listen-label");
    const title = document.querySelector(".article-head h1")?.textContent ?? "";
    const dek = document.querySelector(".dek")?.textContent ?? "";
    // Spoken in chunks, because some browsers stop partway through long text.
    const parts = [title, dek, ...[...article.querySelectorAll("p, li, h2, h3")].map((el) => el.textContent)]
      .map((t) => t.trim())
      .filter(Boolean);

    // Rough running time at an average speaking pace.
    const words = parts.join(" ").split(/\s+/).length;
    const secs = Math.max(1, Math.round((words / 160) * 60));
    listen.querySelector(".listen-time").textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

    const setState = (state) => {
      listen.classList.toggle("is-playing", state === "playing");
      label.textContent = { playing: "Pause", paused: "Resume", idle: "Listen to article" }[state];
    };

    listen.addEventListener("click", () => {
      const synth = speechSynthesis;
      if (synth.speaking && !synth.paused) {
        synth.pause();
        setState("paused");
      } else if (synth.paused) {
        synth.resume();
        setState("playing");
      } else {
        synth.cancel();
        parts.forEach((text, i) => {
          const utterance = new SpeechSynthesisUtterance(text);
          if (i === parts.length - 1) utterance.onend = () => setState("idle");
          synth.speak(utterance);
        });
        setState("playing");
      }
    });

    addEventListener("pagehide", () => speechSynthesis.cancel());
    listen.hidden = false;
  }

  // Share: the phone's share menu on touch devices, otherwise copy the link.
  const share = document.querySelector(".share");
  if (share) {
    const label = share.querySelector(".share-label");
    share.addEventListener("click", async () => {
      const url = location.href;
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        try { await navigator.share({ title: document.title, url }); } catch {}
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        label.textContent = "Link copied";
        setTimeout(() => { label.textContent = "Share"; }, 2000);
      } catch {}
    });
    share.hidden = false;
  }
}
