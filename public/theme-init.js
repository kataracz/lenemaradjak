try {
  const stored = localStorage.getItem("lenemaradjak-theme");
  const dark =
    stored === "dark" ||
    (!stored && matchMedia("(prefers-color-scheme: dark)").matches);
  if (dark) document.documentElement.classList.add("dark");
} catch {}
