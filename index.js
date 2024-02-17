// Prepare for some of the worst code seen by mankind

import * as THREE from 'https://unpkg.com/three@0.127.0/build/three.module.js';
import { FlyControls } from 'https://unpkg.com/three@0.127.0/examples/jsm/controls/FlyControls.js';

var container;
var camera, scene, renderer, clock, controller;
var uniforms;
let camPositionSpan, camLookAtSpan
var fakePosition = new THREE.Vector3(5, 5, 5);
var mouseDown = false;

var select_object_type_at_position_element = document.getElementById('optical_element_toggle');
var should_follow_camera_element = document.getElementById('should_follow_camera');
var should_follow_camera_box = document.getElementById('should_follow_camera_box');
var should_show_light_info = document.getElementById('light_exists_at_this_position');
var should_show_optical_element_info = document.getElementById('optical_element_exists_at_this_position');

var travel_distance_num = document.getElementById('travel_distance');
var travel_distance = document.getElementById('set_fixed_travel_distance');
var travel_distance_box  = document.getElementById('travel_distance_box');

var waist_radius = document.getElementById('waist_radius');
var wavelength = document.getElementById('wavelength');

var X = document.getElementById("x");
var Y = document.getElementById("y");
var Z = document.getElementById("z");

var PX1 = document.getElementById("PX1");
var PX2 = document.getElementById("PX2");
var PY1 = document.getElementById("PY1");
var PY2 = document.getElementById("PY2");

var lastPosEntered = "";

var NONE = 0;
var LIGHT = 1;
var OPTICAL_ELEMENT = 2;

var lights = new Map();
let optical_elements = new Map();
let blocks = {};

// var vertexShader = await fetch("http://localhost:5173/main.vert").then(response => response.text());
// var fragmentShader = await fetch("http://localhost:5173/main.frag").then(response => response.text());

function onBlockTypeChange(e, v) {
  console.log(e)
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  if (select_object_type_at_position_element.selectedIndex === NONE) {
    optical_elements.delete(pos_to_string);
    lights.delete(pos_to_string);

  } else if (select_object_type_at_position_element.selectedIndex === LIGHT) {
    lights.set(
      pos_to_string,
      {
        // color: new THREE.Vector3(parseInt(R.value), parseInt(G.value), parseInt(B.value)),
        polX: new THREE.Vector2(parseFloat(PX1.value), parseFloat(PX2.value)),
        polY: new THREE.Vector2(parseFloat(PY1.value), parseFloat(PY2.value)),
        look_at_position: new THREE.Vector3(),
        light_should_follow: false,
        fixed_travel_distance: false,
        travel_distance: 1,
        wavelength: 1,
        waist_radius: 1,
        pos: new THREE.Vector3(parseInt(current_truncated_position.x), parseInt(current_truncated_position.y), parseInt(current_truncated_position.z))
      }
    );

    optical_elements.delete(pos_to_string);

  } else if (select_object_type_at_position_element.selectedIndex === OPTICAL_ELEMENT) {
    lights.delete(pos_to_string);
    optical_elements.set(pos_to_string, select_object_type_at_position_element.selectedIndex);
  }
}

function onSetFixedDistanceChange(e, v) {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = lights.get(pos_to_string);
  if (current_value.light_should_follow) {
    current_value.light_should_follow = false;
  } else {
    current_value.light_should_follow = true;
  }

  console.log(current_value);

  lights.set(
    pos_to_string,
    current_value
  );
}

function onShouldFollowCameraChange(e, v) {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = lights.get(pos_to_string);
  if (current_value.light_should_follow) {
    current_value.light_should_follow = false;
  } else {
    current_value.light_should_follow = true;
  }

  console.log(current_value);

  lights.set(
    pos_to_string,
    current_value
  );
}

select_object_type_at_position_element.addEventListener("change", onBlockTypeChange);
should_follow_camera_element.addEventListener("change", onShouldFollowCameraChange);

// Terrible stuff that should never be repeated
travel_distance_num.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = lights.get(pos_to_string);
  current_value.travel_distance = parseFloat(e.target.value);

  lights.set(
    pos_to_string,
    current_value
  );
});

travel_distance.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = lights.get(pos_to_string);
  if (current_value.fixed_travel_distance) {
    current_value.fixed_travel_distance = false;
  } else {
    current_value.fixed_travel_distance = true;
  }

  console.log(current_value);

  lights.set(
    pos_to_string,
    current_value
  );

});

waist_radius.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = lights.get(pos_to_string);
  current_value.waist_radius = parseFloat(e.target.value);

  console.log(current_value);

  lights.set(
    pos_to_string,
    current_value
  );
});

wavelength.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = lights.get(pos_to_string);
  current_value.wavelength = parseFloat(e.target.value);

  console.log(current_value);

  lights.set(
    pos_to_string,
    current_value
  );
});

X.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = lights.get(pos_to_string);
  current_value.look_at_position.x = parseFloat(e.target.value);

  console.log(current_value);

  lights.set(
    pos_to_string,
    current_value
  );
});

Y.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = lights.get(pos_to_string);
  current_value.look_at_position.y = parseFloat(e.target.value);

  console.log(current_value);

  lights.set(
    pos_to_string,
    current_value
  );
});

Z.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = lights.get(pos_to_string);
  current_value.look_at_position.z = parseFloat(e.target.value);

  console.log(current_value);

  lights.set(
    pos_to_string,
    current_value
  );
});

PX1.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = lights.get(pos_to_string);
  current_value.polX.x = parseFloat(e.target.value);

  console.log(current_value);

  lights.set(
    pos_to_string,
    current_value
  );
});

PX2.addEventListener("change", (e, v) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = lights.get(pos_to_string);
  current_value.polX.y = parseFloat(PX2.value);

  console.log(current_value);

  lights.set(
    pos_to_string,
    current_value
  );
});

PY1.addEventListener("change", (e, v) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = lights.get(pos_to_string);
  current_value.polY.x = parseFloat(PY1.value);

  console.log(current_value);

  lights.set(
    pos_to_string,
    current_value
  );
});

PY2.addEventListener("change", (e, v) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = lights.get(pos_to_string);
  current_value.polY.y = parseFloat(PY2.value);

  console.log(current_value);

  lights.set(
    pos_to_string,
    current_value
  );
});

var pressedKeys = {};
window.onkeyup = function(e) { pressedKeys[e.keyCode] = false; }
window.onkeydown = function(e) { pressedKeys[e.keyCode] = true; }

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

async function init() {
  should_follow_camera_element.checked = false;
  set_fixed_travel_distance.checked = false;
  container = document.getElementById( 'container' );

  camera = new THREE.Camera();

  camPositionSpan = document.querySelector("#position");
  camLookAtSpan = document.querySelector("#lookingAt");

  scene = new THREE.Scene();
  clock = new THREE.Clock();

  var geometry = new THREE.PlaneGeometry( 2, 2 );

  var polarization = {
    Ex: new THREE.Vector2(4.5, 0.5),
    Ey: new THREE.Vector2(4.5, 0.5)
  }

  uniforms = {
    t: { type: "f", value: 1.0 },
    viewportDimensions: { type: "v2", value: new THREE.Vector2() },
    position: { type: "v3", value: fakePosition },
    rotation: { type: "v2", value: new THREE.Vector2(0, 0) },
    number_of_lights: {type: "int", value: 0},
    number_of_optical_objects: {type: "int", value: 0},

    light_positions: {
      type: "v3",
      value: Array(10).fill(new THREE.Vector3(0.5, 0.5, 0.5))
    },

    light_polarizationsX: {
      type: "v2",
      value: Array(10).fill(new THREE.Vector2())
    },

    light_polarizationsY: {
      type: "v2",
      value: Array(10).fill(new THREE.Vector2())
    },

    light_should_follow: {
      type: "bool",
      value: Array(10).fill(false)
    },

    light_look_at_position: {
      type: "v3",
      value: Array(10).fill(new THREE.Vector3())
    },

    travels_fixed_distance: {
      type: "bool",
      value: Array(10).fill(false)
    },

    travel_distance: {
      type: "f",
      value: Array(10).fill(false)
    },

    light_waist_radius: {
      type: "f",
      value: Array(10).fill(false)
    },

    light_wavelength: {
      type: "f",
      value: Array(10).fill(false)
    },

  };

  // console.log(uniforms.light_positions);

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

  controller = new FlyControls( camera, renderer.domElement );
  controller.dragToLook = true;
  controller.movementSpeed = 10;
  controller.rollSpeed = Math.PI / 1;
  controller.autoForward = false;

  container.appendChild( renderer.domElement );

  onWindowResize();
  window.addEventListener( 'resize', onWindowResize, false );

  // document.onmousemove = function(e){
  //   if (mouseDown) {
  //     uniforms.rotation.value.x = e.pageX * 0.005
  //     uniforms.rotation.value.y = e.pageY * 0.005
  //   }
  // }

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
  controller.update(0.01)
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  // check which menu we should show
  if (lights.has(pos_to_string)) {
    // Only update values on entering new pos
    var current_value = lights.get(pos_to_string);
    if (pos_to_string != lastPosEntered) {
      PX1.value = current_value.polX.x;
      PX2.value = current_value.polX.y;
      PY1.value = current_value.polY.x;
      PY2.value = current_value.polY.y;

      X.value = current_value.look_at_position.x;
      Y.value = current_value.look_at_position.y;
      Z.value = current_value.look_at_position.z;

      waist_radius.value = current_value.waist_radius;
      wavelength.value = current_value.wavelength;

      travel_distance.checked = current_value.fixed_travel_distance;
      travel_distance_num.value = current_value.travel_distance;
      should_follow_camera_element.checked = current_value.light_should_follow;
      lastPosEntered = pos_to_string;
    }

    select_object_type_at_position_element.selectedIndex = LIGHT;
    should_show_light_info.style.display = "block"

    if (current_value.light_should_follow) {
      should_follow_camera_box.style.display = "block"
    } else {
      should_follow_camera_box.style.display = "none"
    }

    if (current_value.fixed_travel_distance) {
      travel_distance_box.style.display = "block"
    } else {
      travel_distance_box.style.display = "none"
    }

    should_show_optical_element_info.style.display = "none"
    optical_elements.delete(pos_to_string)

  } else if (optical_elements.has(pos_to_string)) {
    select_object_type_at_position_element.selectedIndex = OPTICAL_ELEMENT;
    should_show_light_info.style.display = "none"
    should_show_optical_element_info.style.display = "block"

    lights.delete(pos_to_string)

  } else {
    select_object_type_at_position_element.selectedIndex = NONE;
    should_show_light_info.style.display = "none"
    should_show_optical_element_info.style.display = "none"

    lights.delete(pos_to_string)
    optical_elements.delete(pos_to_string)
  }

  // console.log(lights.size);
  uniforms.number_of_lights.value = lights.size;
  // console.log(uniforms.number_of_lights.value);
  var pol_thing = [];

  // update the uniforms with the current values of the lights
  var i = 0;
  for (let [key, value] of lights.entries()) {
    // console.log(value.pos)
    uniforms.light_positions.value[i] = new THREE.Vector3(value.pos.x + 0.5, value.pos.y + 0.5, value.pos.z + 0.5);
    uniforms.light_polarizationsX.value[i] = value.polX;
    uniforms.light_polarizationsY.value[i] = value.polY;
    uniforms.light_should_follow.value[i] = value.light_should_follow;
    uniforms.light_look_at_position.value[i] = value.look_at_position;
    uniforms.travels_fixed_distance.value[i] = value.fixed_travel_distance;
    uniforms.travel_distance.value[i] = value.travel_distance;
    uniforms.light_waist_radius.value[i] = value.waist_radius;
    uniforms.light_wavelength.value[i] = value.wavelength;
    i += 1;
  }

  // console.log(light_thing);
  // uniforms.light_objects = {
  //   value: light_thing
  // };

  // Check for input to rotate the camera
  // "LEFT"[37]
  // "UP"[38]
  // "RIGHT"[39]
  // "DOWN"[40]

  var speed = 0.05;

  if (pressedKeys[37]) {
    uniforms.rotation.value.x -= speed;
  }

  if (pressedKeys[38] && uniforms.rotation.value.y > -1) {
    uniforms.rotation.value.y -= speed;
  }

  if (pressedKeys[39]) {
    uniforms.rotation.value.x += speed;
  }

  if (pressedKeys[40] && uniforms.rotation.value.y < 1) {
    uniforms.rotation.value.y += speed;
  }

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
