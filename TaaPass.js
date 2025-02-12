import { ShaderMaterial, UniformsUtils, WebGLRenderTarget } from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const TAAShader = {
    uniforms: {
        "tCurrent": { value: null },
        "tAccum": { value: null },
        "alpha": { value: 0.1 } // blending factor; adjust as needed
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tCurrent;
        uniform sampler2D tAccum;
        uniform float alpha;
        varying vec2 vUv;
        void main() {
            vec4 curr = texture2D(tCurrent, vUv);
            vec4 accum = texture2D(tAccum, vUv);
            gl_FragColor = mix(accum, curr, alpha);
        }
    `
};

class TaaPass extends Pass {
    constructor() {
        super();
        this.uniforms = UniformsUtils.clone(TAAShader.uniforms);
        this.material = new ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: TAAShader.vertexShader,
            fragmentShader: TAAShader.fragmentShader
        });
        this.fsQuad = new FullScreenQuad(this.material);
        this.accumulationRenderTarget = null;
    }
    
    render(renderer, writeBuffer, readBuffer) {
        if (!this.accumulationRenderTarget) {
            this.accumulationRenderTarget = new WebGLRenderTarget(
                readBuffer.width, readBuffer.height, readBuffer.texture.texture ? readBuffer.texture.texture : {}
            );
            this.accumulationRenderTarget.texture.name = "TaaPass.accumulation";
        }
        this.uniforms['tCurrent'].value = readBuffer.texture;
        this.uniforms['tAccum'].value = this.accumulationRenderTarget.texture;
        renderer.setRenderTarget(writeBuffer);
        this.fsQuad.render(renderer);
        // Update accumulation buffer using a separate target.
        renderer.setRenderTarget(this.accumulationRenderTarget);
        this.fsQuad.render(renderer);
        renderer.setRenderTarget(null);
    }
    
    setSize(width, height) {
        if (this.accumulationRenderTarget) {
            this.accumulationRenderTarget.setSize(width, height);
        }
    }
}

export { TaaPass };
