// Vaegis ses değiştirici: gerçek zamanlı ses perdesi kaydırma.
// İki okuma ucu, gecikme hattında sesi farklı hızla tarar; uçlar birbirine yumuşakça geçer (taneli perde kaydırma).
class VaegisPitch extends AudioWorkletProcessor {
  static get parameterDescriptors(){
    return [{ name: "ratio", defaultValue: 1, minValue: 0.25, maxValue: 4, automationRate: "k-rate" }];
  }
  constructor(){
    super();
    this.size = 16384;
    this.buf = new Float32Array(this.size);
    this.w = 0;
    this.win = Math.round(sampleRate * 0.05);   // 50 ms pencere
    this.phase = 0;
    this.alive = true;
    this.port.onmessage = e => { if (e.data === "stop") this.alive = false; };
  }
  read(d){
    let p = this.w - d - 1;
    while (p < 0) p += this.size;
    const i = Math.floor(p), f = p - i, a = this.buf[i], b = this.buf[(i + 1) % this.size];
    return a + (b - a) * f;
  }
  process(inputs, outputs, params){
    if (!this.alive) return false;
    const inp = inputs[0] && inputs[0][0], outs = outputs[0];
    if (!outs || !outs[0]) return true;
    const out = outs[0], r = params.ratio[0], N = this.win, step = 1 - r;
    for (let i = 0; i < out.length; i++){
      this.buf[this.w] = inp ? inp[i] : 0;
      this.phase += step;
      if (this.phase >= N) this.phase -= N; else if (this.phase < 0) this.phase += N;
      const d1 = this.phase, d2 = (this.phase + N / 2) % N;
      const s1 = Math.sin(Math.PI * d1 / N), s2 = Math.sin(Math.PI * d2 / N);
      out[i] = s1 * s1 * this.read(d1) + s2 * s2 * this.read(d2);   // toplamı her an 1: ses düzeyi dalgalanmaz
      this.w = (this.w + 1) % this.size;
    }
    for (let c = 1; c < outs.length; c++) outs[c].set(out);
    return true;
  }
}
registerProcessor("vaegis-pitch", VaegisPitch);
