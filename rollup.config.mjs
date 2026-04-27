import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const version = readFileSync('./VERSION', 'utf-8').trim();
const license = readFileSync('./LICENSE.js', 'utf-8')
  .replace('@VERSION', version)
  .replace('@DATE', new Date().toISOString().split('T')[0]);

// Plugin to import SVG files as strings
function svgPlugin() {
  return {
    name: 'svg',
    transform(code, id) {
      if (id.endsWith('.svg')) {
        const content = readFileSync(id, 'utf-8');
        return {
          code: `export default ${JSON.stringify(content)};`,
          map: null
        };
      }
    }
  };
}

const banner = license;

export default [
  // Main UMD build
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/freedomplayer.js',
        format: 'umd',
        name: 'freedomplayer',
        banner,
        sourcemap: true,
        exports: 'default'
      }
    ],
    plugins: [
      svgPlugin(),
      nodeResolve(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        sourceMap: true
      })
    ]
  },
  // Minified build
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/freedomplayer.min.js',
        format: 'umd',
        name: 'freedomplayer',
        banner,
        sourcemap: false,
        exports: 'default'
      }
    ],
    plugins: [
      svgPlugin(),
      nodeResolve(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        sourceMap: false
      }),
      terser({
        format: {
          comments: /foliovision\.com\/player\/legal\/freedom-player-license/
        }
      })
    ]
  },
  // ES module build
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/freedomplayer.esm.js',
        format: 'es',
        banner,
        sourcemap: true
      }
    ],
    plugins: [
      svgPlugin(),
      nodeResolve(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist/types',
        sourceMap: true
      })
    ]
  }
];
