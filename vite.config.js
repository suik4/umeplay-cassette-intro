import { defineConfig } from "vite";

// GitHub Pages는 https://<user>.github.io/<repo>/ 하위 경로로 서비스되므로
// 빌드 결과의 에셋 경로에 저장소 이름이 붙어야 한다.
// 로컬 개발(npm run dev)에서는 "/"를 그대로 쓴다.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/umeplay-cassette-intro/" : "/",
}));
