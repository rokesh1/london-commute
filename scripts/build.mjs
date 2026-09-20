import { cp, rm, access } from "node:fs/promises";
await access("public/index.html");
await rm("dist", { recursive: true, force: true });
await cp("public", "dist", { recursive: true });
console.log("Built static dashboard in dist/");
