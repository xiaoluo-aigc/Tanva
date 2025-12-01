@group(0) @binding(0) var<storage, read> inputBuffer : array<f32>;
@group(0) @binding(1) var outputTex : texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8, 1) 
fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
    let screenSize = textureDimensions(outputTex);
    if (any(GlobalInvocationID.xy > screenSize)) {
        return;
    }
    let screenPos = vec2<i32>(i32(GlobalInvocationID.x), i32(GlobalInvocationID.y));

    // Calculate the index in the buffer
    let bufferIndex = (GlobalInvocationID.y * screenSize.x + GlobalInvocationID.x) * 4u;

    // Read color from buffer
    let color = vec4<f32>(
        inputBuffer[bufferIndex],
        inputBuffer[bufferIndex + 1u],
        inputBuffer[bufferIndex + 2u],
        inputBuffer[bufferIndex + 3u]
    );

    textureStore(outputTex, screenPos, color);
}