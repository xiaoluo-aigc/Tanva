struct VertexOutput {
	@builtin(position) position : vec4<f32>, @location(0) uv : vec2<f32>
};

@vertex fn main(@builtin(vertex_index) VertexIndex : u32)->VertexOutput {
	var output : VertexOutput;

	output.uv = vec2<f32>(f32((VertexIndex << 1) & 2), f32(VertexIndex & 2));
	output.position = vec4<f32>(output.uv * 2.0 - 1.0, 0.0, 1.0);

	return output;
}
