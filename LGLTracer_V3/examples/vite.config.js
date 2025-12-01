import { defineConfig } from 'vite';
import mpa from 'vite-plugin-mpa';

export default defineConfig({
	plugins: [
		mpa({
			open: '/basic/index.html',
			scanFile: 'index.html'
		})
	],
	publicDir: 'assets',
	server: {
		port: 8888
	}
});
