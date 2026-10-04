// Blog page: live filter over the post list. The box stays hidden
// without JS so nobody sees a search that does nothing.
const filter = document.getElementById("filter");

if (filter) {
  const posts = [...document.querySelectorAll("#posts > li")];
  const empty = document.getElementById("no-results");

  filter.closest(".search").hidden = false;

  filter.addEventListener("input", () => {
    const q = filter.value.trim().toLowerCase();
    let shown = 0;

    posts.forEach((post) => {
      const match = post.textContent.toLowerCase().includes(q);
      post.hidden = !match;
      if (match) shown++;
    });

    empty.hidden = shown > 0;
  });
}
