import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import svelte from 'rollup-plugin-svelte'

export default {
	input: `./client/join.js`,
	output: {
		file: `./public/build/join-bundle.js`,
		format: `iife`,
		sourcemap: true,
	},
	plugins: [
		svelte({
			preprocess: {
				style: (...args) => sveltePreprocessPostcss()(...args).catch(err => {
					console.error(err)
					throw err
				}),
			},
			css(css) {
				css.write(`public/build/components.css`)
			},
		}),
		commonjs(),
		json(),
		resolve({
			browser: true,
		}),
		visualizer(),
	],
}
