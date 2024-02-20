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

var jones_matrices_quick_select = document.getElementById('jones_matrices_quick_select');
var light_polarization_quick_select = document.getElementById('quick_light_polarization');

var pol_coeff = document.getElementById('pol_coefficient')

var X = document.getElementById("x");
var Y = document.getElementById("y");
var Z = document.getElementById("z");

var ar = document.getElementById("ar");
var ai = document.getElementById("ai");
var br = document.getElementById("br");
var bi = document.getElementById("bi");
var cr = document.getElementById("cr");
var ci = document.getElementById("ci");
var dr = document.getElementById("dr");
var di = document.getElementById("di");

var coeff_r = document.getElementById("coeff_r");
var coeff_i = document.getElementById("coeff_i");

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

function replaceForMath(s) {
  var changed_value = s.replace(/cos/g, "Math.cos");
  changed_value = changed_value.replace(/sin/g, "Math.sin");
  changed_value = changed_value.replace(/sqrt/g, "Math.sqrt");
  changed_value = changed_value.replace(/pi/g, "Math.PI");

  return changed_value
}

function onBlockTypeChange(e, v) {
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
        polX: new THREE.Vector2("1", "1"),
        polY: new THREE.Vector2("1", "1"),
        coefficient: "1",
        chosen_quick_polarization: 0,
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
    optical_elements.set(pos_to_string, {
      pos: new THREE.Vector3(parseInt(current_truncated_position.x), parseInt(current_truncated_position.y), parseInt(current_truncated_position.z)),
      // yes, making these all into string is stupid but i
      // cant ensure they won't explode at parseFloat otherwise
      a: new THREE.Vector2("0", "0"),
      b: new THREE.Vector2("0", "0"),
      c: new THREE.Vector2("0", "0"),
      d: new THREE.Vector2("0", "0"),
      coefficient: new THREE.Vector2("1", "0"),
      chosen_quick_jones_matrix: 0
    });
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

const HORIZONTAL_LINEAR_POL = 1;
const VERTICAL_LINEAR_POL = 2;
const POS_45_POL = 3;
const NEG_45_POL = 4;
const RIGHT_CIRC_POL = 5;
const LEFT_CIRC_POL = 6;
const THETA_ANGLE_LINEAR_POL = 7;
const QWP_VERT = 8;
const QWP_HOR = 9;
const QWP_PI = 10;
const HWP_ROT_PI = 11;
const HWP_HOR = 12;
const PHASE_ROT = 13;

light_polarization_quick_select.addEventListener("change", (e, v) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();
  var current_value = lights.get(pos_to_string);
  current_value.chosen_quick_polarization = light_polarization_quick_select.selectedIndex;

  console.log(light_polarization_quick_select.selectedIndex);

  if (light_polarization_quick_select.selectedIndex != NONE) {
    // we want the html tag to update properly
    lastPosEntered = "";

  }

  if (light_polarization_quick_select.selectedIndex == HORIZONTAL_LINEAR_POL) {
    current_value.coefficient = "1";
    current_value.polX = new THREE.Vector2("1", "0");
    current_value.polY = new THREE.Vector2("0", "0");

  } else if (light_polarization_quick_select.selectedIndex == VERTICAL_LINEAR_POL) {
    current_value.coefficient = "1";
    current_value.polX = new THREE.Vector2("0", "0");
    current_value.polY = new THREE.Vector2("1", "0");

  } else if (light_polarization_quick_select.selectedIndex == POS_45_POL) {
    current_value.coefficient = "1";
    current_value.polX = new THREE.Vector2("1/sqrt(2)", "0");
    current_value.polY = new THREE.Vector2("1/sqrt(2)", "0");

  } else if (light_polarization_quick_select.selectedIndex == NEG_45_POL) {
    current_value.coefficient = "1";
    current_value.polX = new THREE.Vector2("1/sqrt(2)", "0");
    current_value.polY = new THREE.Vector2("-1/sqrt(2)", "0");

  } else if (light_polarization_quick_select.selectedIndex == RIGHT_CIRC_POL) {
    current_value.coefficient = "1";
    current_value.polX = new THREE.Vector2("1/sqrt(2)", "0");
    current_value.polY = new THREE.Vector2("1/sqrt(2)", "-1");

  } else if (light_polarization_quick_select.selectedIndex == LEFT_CIRC_POL) {
    current_value.coefficient = "1";
    current_value.polX = new THREE.Vector2("1/sqrt(2)", "0");
    current_value.polY = new THREE.Vector2("1/sqrt(2)", "1");
  }

  lights.set(
    pos_to_string,
    current_value
  )
})

jones_matrices_quick_select.addEventListener("change", (e, v) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();
  var current_value = optical_elements.get(pos_to_string);
  current_value.chosen_quick_jones_matrix = jones_matrices_quick_select.selectedIndex;

  console.log(jones_matrices_quick_select.selectedIndex);

  if (jones_matrices_quick_select.selectedIndex != NONE) {
    // we want the html tag to update properly
    lastPosEntered = "";
  }

  if (jones_matrices_quick_select.selectedIndex == HORIZONTAL_LINEAR_POL) {
    current_value.coefficient = new THREE.Vector2("1", "0");
    current_value.a = new THREE.Vector2("1", "0");
    current_value.b = new THREE.Vector2("0", "0");
    current_value.c = new THREE.Vector2("0", "0");
    current_value.d = new THREE.Vector2("0", "0");

  } else if (jones_matrices_quick_select.selectedIndex == VERTICAL_LINEAR_POL) {
    current_value.coefficient = new THREE.Vector2("1", "0");
    current_value.a = new THREE.Vector2("0", "0");
    current_value.b = new THREE.Vector2("0", "0");
    current_value.c = new THREE.Vector2("0", "0");
    current_value.d = new THREE.Vector2("1", "0");

  } else if (jones_matrices_quick_select.selectedIndex == POS_45_POL) {
    current_value.coefficient = new THREE.Vector2("0.5", "0");
    current_value.a = new THREE.Vector2("1", "0");
    current_value.b = new THREE.Vector2("1", "0");
    current_value.c = new THREE.Vector2("1", "0");
    current_value.d = new THREE.Vector2("1", "0");

  } else if (jones_matrices_quick_select.selectedIndex == NEG_45_POL) {
    current_value.coefficient = new THREE.Vector2("0.5", "0");
    current_value.a = new THREE.Vector2("1", "0");
    current_value.b = new THREE.Vector2("-1", "0");
    current_value.c = new THREE.Vector2("-1", "0");
    current_value.d = new THREE.Vector2("1", "0");

  } else if (jones_matrices_quick_select.selectedIndex == RIGHT_CIRC_POL) {
    current_value.coefficient = new THREE.Vector2("0.5", "0");
    current_value.a = new THREE.Vector2("1", "0");
    current_value.b = new THREE.Vector2("0", "1");
    current_value.c = new THREE.Vector2("0", "-1");
    current_value.d = new THREE.Vector2("1", "0");

  } else if (jones_matrices_quick_select.selectedIndex == LEFT_CIRC_POL) {
    current_value.coefficient = new THREE.Vector2("0.5", "0");
    current_value.a = new THREE.Vector2("1", "0");
    current_value.b = new THREE.Vector2("0", "-1");
    current_value.c = new THREE.Vector2("0", "1");
    current_value.d = new THREE.Vector2("1", "0");

  } else if (jones_matrices_quick_select.selectedIndex == THETA_ANGLE_LINEAR_POL) {
    current_value.coefficient = new THREE.Vector2("1", "0");
    current_value.a = new THREE.Vector2("cos(pi) ** 2", "0");
    current_value.b = new THREE.Vector2("cos(pi) * sin(pi)", "0");
    current_value.c = new THREE.Vector2("sin(pi) * cos(pi)", "0");
    current_value.d = new THREE.Vector2("sin(pi) ** 2", "0");

  } else if (jones_matrices_quick_select.selectedIndex == QWP_VERT) {
    current_value.coefficient = new THREE.Vector2("1", "pi/4");
    current_value.a = new THREE.Vector2("1", "0");
    current_value.b = new THREE.Vector2("0", "0");
    current_value.c = new THREE.Vector2("0", "0");
    current_value.d = new THREE.Vector2("0", "1");

  } else if (jones_matrices_quick_select.selectedIndex == QWP_HOR) {
    current_value.coefficient = new THREE.Vector2("1", "-pi/4");
    current_value.a = new THREE.Vector2("1", "0");
    current_value.b = new THREE.Vector2("0", "0");
    current_value.c = new THREE.Vector2("0", "0");
    current_value.d = new THREE.Vector2("0", "1");

  } else if (jones_matrices_quick_select.selectedIndex == QWP_PI) {
    current_value.coefficient = new THREE.Vector2("1", "-pi/4");
    current_value.a = new THREE.Vector2("cos(pi) ** 2", "sin(pi) ** 2");
    current_value.b = new THREE.Vector2("sin(pi) * cos(pi)", "-sin(pi)*cos(pi)");
    current_value.c = new THREE.Vector2("sin(pi) * cos(pi)", "-sin(pi)*cos(pi)");
    current_value.d = new THREE.Vector2("sin(pi) ** 2", "cos(pi) ** 2");

  } else if (jones_matrices_quick_select.selectedIndex == HWP_ROT_PI) {
    current_value.coefficient = new THREE.Vector2("1", "0");
    current_value.a = new THREE.Vector2("cos(2 * pi)", "0");
    current_value.b = new THREE.Vector2("sin(2 * pi)", "0");
    current_value.c = new THREE.Vector2("sin(2 * pi)", "0");
    current_value.d = new THREE.Vector2("-cos(2 * pi)", "0");

  } else if (jones_matrices_quick_select.selectedIndex == HWP_HOR) {
    current_value.coefficient = new THREE.Vector2("1", "-pi/2");
    current_value.a = new THREE.Vector2("cos(pi)**2 - sin(pi) ** 2", "0");
    current_value.b = new THREE.Vector2("2 * cos(pi) * sin(pi)", "0");
    current_value.c = new THREE.Vector2("2 * cos(pi) * sin(pi)", "0");
    current_value.d = new THREE.Vector2("sin(pi) ** 2 - cos(pi) ** 2", "0");

  } else if (jones_matrices_quick_select.selectedIndex == PHASE_ROT) {
    current_value.coefficient = new THREE.Vector2("1", "0");
    current_value.a = new THREE.Vector2("cos(pi)", "0");
    current_value.b = new THREE.Vector2("sin(pi)", "0");
    current_value.c = new THREE.Vector2("-sin(pi)", "0");
    current_value.d = new THREE.Vector2("cos(pi)", "0");
  }

  optical_elements.set(
    pos_to_string,
    current_value
  )
})

// Terrible stuff that should never be repeated (setting up all the listeners individually) BEGIN
coeff_r.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = optical_elements.get(pos_to_string);
  current_value.coefficient.y = e.target.value;

  optical_elements.set(
    pos_to_string,
    current_value
  );
});

coeff_i.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = optical_elements.get(pos_to_string);
  current_value.coefficient.y = e.target.value;

  optical_elements.set(
    pos_to_string,
    current_value
  );
});

ar.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = optical_elements.get(pos_to_string);

  current_value.a.x = e.target.value;

  console.log(current_value);

  optical_elements.set(
    pos_to_string,
    current_value
  );
});

ai.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = optical_elements.get(pos_to_string);

  current_value.a.y = e.target.value;

  optical_elements.set(
    pos_to_string,
    current_value
  );
});

br.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = optical_elements.get(pos_to_string);

  current_value.b.x = e.target.value;

  optical_elements.set(
    pos_to_string,
    current_value
  );
});

bi.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = optical_elements.get(pos_to_string);

  current_value.b.y = e.target.value;

  optical_elements.set(
    pos_to_string,
    current_value
  );
});

cr.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = optical_elements.get(pos_to_string);

  current_value.c.x = e.target.value;

  optical_elements.set(
    pos_to_string,
    current_value
  );
});

ci.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = optical_elements.get(pos_to_string);

  current_value.c.y = e.target.value;

  optical_elements.set(
    pos_to_string,
    current_value
  );
});

dr.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = optical_elements.get(pos_to_string);

  current_value.d.x = e.target.value;

  optical_elements.set(
    pos_to_string,
    current_value
  );
});

di.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = optical_elements.get(pos_to_string);

  current_value.d.y = e.target.value;

  optical_elements.set(
    pos_to_string,
    current_value
  );
});

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

pol_coeff.addEventListener("change", (e) => {
  var current_truncated_position = new THREE.Vector3(Math.floor(fakePosition.x), Math.floor(fakePosition.y), Math.floor(fakePosition.z));
  var pos_to_string = current_truncated_position.x.toString() + current_truncated_position.y.toString() + current_truncated_position.z.toString();

  var current_value = lights.get(pos_to_string);
  current_value.coefficient = e.target.value;

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
  current_value.polX.x = e.target.value;

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
  current_value.polX.y = PX2.value;

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
  current_value.polY.x = PY1.value;

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
  current_value.polY.y = PY2.value;

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

    optical_objects_positions: {
      value: Array(20).fill(new THREE.Vector3())
    },

    jones_matrices_a: {value: Array(20).fill(new THREE.Vector2())},
    jones_matrices_b: {value: Array(20).fill(new THREE.Vector2())},
    jones_matrices_c: {value: Array(20).fill(new THREE.Vector2())},
    jones_matrices_d: {value: Array(20).fill(new THREE.Vector2())},

    complex_coefficients: {
      value: Array(20).fill(new THREE.Vector2())
    }
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

      pol_coeff.value = current_value.coefficient;

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
    var current_value = optical_elements.get(pos_to_string);
    if (pos_to_string != lastPosEntered) {
      ar.value = current_value.a.x;
      ai.value = current_value.a.y;
      br.value = current_value.b.x;
      bi.value = current_value.b.y;
      cr.value = current_value.c.x;
      ci.value = current_value.c.y;
      dr.value = current_value.d.x;
      di.value = current_value.d.y;

      coeff_r.value = current_value.coefficient.x;
      coeff_i.value = current_value.coefficient.y;

      lastPosEntered = pos_to_string;

      jones_matrices_quick_select.selectedIndex = current_value.chosen_quick_jones_matrix;
    }

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
  uniforms.number_of_optical_objects.value = optical_elements.size;
  // console.log(uniforms.number_of_lights.value);
  var pol_thing = [];

  // update the uniforms with the current values of the lights
  var i = 0;
  for (let [key, value] of lights.entries()) {
    // console.log(value.pos)
    uniforms.light_positions.value[i] = new THREE.Vector3(value.pos.x + 0.5, value.pos.y + 0.5, value.pos.z + 0.5);

    var px = new THREE.Vector2(parseFloat(eval(replaceForMath(value.polX.x))), parseFloat(eval(replaceForMath(value.polX.y))));
    var py = new THREE.Vector2(parseFloat(eval(replaceForMath(value.polY.x))), parseFloat(eval(replaceForMath(value.polY.y))));

    var coeff_num = parseFloat(eval(replaceForMath(value.coefficient)));

    uniforms.light_polarizationsX.value[i] = px;
    uniforms.light_polarizationsY.value[i] = py;

    uniforms.light_should_follow.value[i] = value.light_should_follow;
    uniforms.light_look_at_position.value[i] = value.look_at_position;
    uniforms.travels_fixed_distance.value[i] = value.fixed_travel_distance;
    uniforms.travel_distance.value[i] = value.travel_distance;
    uniforms.light_waist_radius.value[i] = value.waist_radius;
    uniforms.light_wavelength.value[i] = value.wavelength;

    i += 1;
  }

  // update the uniforms with the current values of the optical objects
  var i = 0;
  for (let [key, value] of optical_elements.entries()) {
    uniforms.optical_objects_positions.value[i] = new THREE.Vector3(value.pos.x + 0.5, value.pos.y + 0.5, value.pos.z + 0.5);

    uniforms.jones_matrices_a.value[i].x = parseFloat(eval(replaceForMath(value.a.x)));
    uniforms.jones_matrices_a.value[i].y = parseFloat(eval(replaceForMath(value.a.y)));

    uniforms.jones_matrices_b.value[i].x = parseFloat(eval(replaceForMath(value.b.x)));
    uniforms.jones_matrices_b.value[i].y = parseFloat(eval(replaceForMath(value.b.y)));

    uniforms.jones_matrices_c.value[i].x = parseFloat(eval(replaceForMath(value.c.x)));
    uniforms.jones_matrices_c.value[i].y = parseFloat(eval(replaceForMath(value.c.y)));

    uniforms.jones_matrices_d.value[i].x = parseFloat(eval(replaceForMath(value.d.x)));
    uniforms.jones_matrices_d.value[i].y = parseFloat(eval(replaceForMath(value.d.y)));

    uniforms.complex_coefficients.value[i].x = parseFloat(eval(replaceForMath(value.coefficient.x)));
    uniforms.complex_coefficients.value[i].y = parseFloat(eval(replaceForMath(value.coefficient.y)));

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
