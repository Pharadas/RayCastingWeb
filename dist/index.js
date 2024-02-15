import * as THREE from 'https://unpkg.com/three@0.127.0/build/three.module.js';
import { FlyControls } from 'https://unpkg.com/three@0.127.0/examples/jsm/controls/FlyControls.js';

var container;
var camera, scene, renderer, clock, controls;
var uniforms;
let camPositionSpan, camLookAtSpan
var fakePosition = new THREE.Vector3();
var mouseDown = false;

// var vertexShader = await fetch("http://localhost:5173/shader.vert").then(response => response.text());
// var fragmentShader = await fetch("http://localhost:5173/shader.frag").then(response => response.text());

init();
animate();

function rotate3dY(v, a) {
    var cosA = Math.cos(a);
    var sinA = Math.sin(a);
    return new THREE.Vector3(
        v.x * cosA + v.z * sinA,
        v.y,
        -v.x * sinA + v.z * cosA
    );
}

function rotate3dX(v, a) {
    var cosA = Math.cos(a);
    var sinA = Math.sin(a);
    return new THREE.Vector3(
        v.x,
        v.y * cosA - v.z * sinA,
        v.y * sinA + v.z * cosA
    );
}

function init() {
  container = document.getElementById( 'container' );

  camera = new THREE.Camera();

  camPositionSpan = document.querySelector("#position");
  camLookAtSpan = document.querySelector("#lookingAt");

  scene = new THREE.Scene();
  clock = new THREE.Clock();

  var geometry = new THREE.PlaneGeometry( 2, 2 );

  uniforms = {
    t: { type: "f", value: 1.0 },
    viewportDimensions: { type: "v2", value: new THREE.Vector2() },
    position: { type: "v3", value: fakePosition },
    rotation: { type: "v2", value: new THREE.Vector2() },
    color: [new THREE.Vector3(0, 0, 0)]
  };

  var vertexShader = document.getElementById( 'vertexShader' ).textContent;
  var fragmentShader = document.getElementById( 'fragmentShader' ).textContent;

  var material = new THREE.ShaderMaterial( {
    glslVersion: THREE.GLSL3,
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader
  } );

  var mesh = new THREE.Mesh( geometry, material );
  scene.add( mesh );

  renderer = new THREE.WebGLRenderer();

  renderer.setPixelRatio(window.devicePixelRatio * 0.2);

  controls = new FlyControls( camera, renderer.domElement );
  controls.dragToLook = true;
  controls.movementSpeed = 10;
  controls.rollSpeed = Math.PI / 1;
  controls.autoForward = false;

  container.appendChild( renderer.domElement );

  onWindowResize();
  window.addEventListener( 'resize', onWindowResize, false );

  document.onmousemove = function(e){
    if (mouseDown) {
      uniforms.rotation.value.x = e.pageX * 0.005
      uniforms.rotation.value.y = e.pageY * 0.005
    }
  }

  document.body.onmousedown = function() { 
    mouseDown = true;
  }

  document.body.onmouseup = function() {
    mouseDown = false;
  }
}

function onWindowResize( event ) {
  renderer.setSize( window.innerWidth, window.innerHeight );
  uniforms.viewportDimensions.value.x = renderer.domElement.width;
  uniforms.viewportDimensions.value.y = renderer.domElement.height;
}

function animate() {
  controls.update(0.01)

  // 5. calculate and display the vector values on screen
  // this copies the camera's unit vector direction to cameraDirection
  // camera.getWorldDirection(cameraDirection)
  // scale the unit vector up to get a more intuitive value

  var rotation = new THREE.Vector2();
  rotation.x = uniforms.rotation.value.x;
  rotation.y = uniforms.rotation.value.y;

  var look_at_position = rotate3dX(new THREE.Vector3(0, 0, 1), rotation.y);
  look_at_position = rotate3dY(look_at_position, rotation.x);

  // cameraDirection.set(look_at_position.x, look_at_position.y, look_at_position.z);
  camera.lookAt(look_at_position);

  fakePosition.add(camera.position);

  // update the onscreen spans with the camera's position and lookAt vectors
  camPositionSpan.innerHTML = `Position: (${fakePosition.x.toFixed(1)}, ${fakePosition.y.toFixed(1)}, ${fakePosition.z.toFixed(1)})`
  camLookAtSpan.innerHTML = `LookAt: (${(look_at_position.x).toFixed(1)}, ${(look_at_position.y).toFixed(1)}, ${(look_at_position.z).toFixed(1)})`

  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = 0;

  requestAnimationFrame( animate );
  render();
}

function render() {
  uniforms.t.value += clock.getDelta();
  renderer.render( scene, camera );
}
