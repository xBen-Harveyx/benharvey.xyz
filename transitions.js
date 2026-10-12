// Page transitions. Moving between the home page and the blog wipes the
// new page across the old one with a wide soft edge, so the light page
// fades into the dark one (and back) as it sweeps. Every other link, like
// blog to post, keeps the browser's default crossfade. Browsers without
// cross-document view transitions never fire these events and just change
// pages normally.
(() => {
  const page = document.documentElement.dataset.page || "";

  // The page being left notes which page it was for the one replacing it.
  addEventListener("pageswap", () => {
    try { sessionStorage.setItem("from-page", page); } catch {}
  });

  addEventListener("pagereveal", (e) => {
    if (!e.viewTransition) return;
    let from = "";
    try { from = sessionStorage.getItem("from-page") || ""; } catch {}
    if (from === "home" && page === "blog") e.viewTransition.types.add("to-blog");
    if (from === "blog" && page === "home") e.viewTransition.types.add("to-home");
  });
})();
