precision mediump float;

// Always include this to get the position of the pixel and map the shader correctly onto the shape

void main() {
  gl_Position = vec4( position, 1.0 );
}
