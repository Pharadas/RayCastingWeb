out vec4 FragColor;

// Complex matrix =
// [a b
//  c d]
struct Complex2x2Matrix {
  vec2 a;
  vec2 b;
  vec2 c;
  vec2 d;
};

struct Polarization {
  vec2 Ex;
  vec2 Ey;
};

struct LightObject {
  vec3 pos;
  vec3 col;
};

uniform float t;
uniform vec2 viewportDimensions;
uniform vec3 position;
uniform vec2 rotation;

uniform int number_of_lights;
uniform int number_of_optical_objects;

// Terrible way of doing this but i cant pass an array of structs which
// contain other structs for some reason and im too tired to look into it :(
uniform vec3 light_positions[10];
uniform vec2 light_polarizationsX[10];
uniform vec2 light_polarizationsY[10];
uniform bool light_should_follow [10];
uniform bool travels_fixed_distance [10];
uniform float travel_distance [10];
uniform vec3 light_look_at_position[10];
uniform float light_wavelength[10];
uniform float light_waist_radius[10];

uniform vec3 optical_objects_positions[20];
// Doest seem to work properly
// uniform Complex2x2Matrix jones_matrices[20];

uniform vec2 jones_matrices_a[20];
uniform vec2 jones_matrices_b[20];
uniform vec2 jones_matrices_c[20];
uniform vec2 jones_matrices_d[20];

uniform vec2 complex_coefficients[20];

#define PI 3.141592

#define MAX_REHITS 1

const bool USE_BRANCHLESS_DDA = true;
const int MAX_RAY_STEPS = 200;

#define LIGHT 0
// Since we are using jones matrices, we should be able
// change this to just be a single matrix object
#define PHASE_POLARIZER 1
#define PHASE_RETARDER  2
#define WALL 3
#define GOAL 4
#define NONE 5

// Have to define it here because we may use it to define the phase retarder
vec2 cx_exp (vec2 z) {
	return exp(z.x) * vec2(cos(z.y), sin(z.y));
}

// UGLY UGLY UGLY, shouldnt have two weird optical objects
// TODO: REFACTOR !!!!!
struct ObjectJonesMatrix {
  // Dont like specifying the type in the name but we represent vec2's as complex numbers
  vec2 complexCoefficient;
  Complex2x2Matrix jones_matrix;
};

struct OpticalObject {
    int type;
    int value; // ugly, but we will use this value as the index for the OBJECTS_JONES_MATRICES for now TODO: REFACTOR
    vec3 alternate_value; // Color in the case of light
    vec3 pos;
};

#define NUMBER_OF_LIGHTS_IN_SCENE 2
#define NUMBER_OF_OPTICAL_OBJECTS 3

struct OpticalObjectStack {
  OpticalObject[10] objects_hit;
  int number_of_objects_hit;
};

struct RayObject {
  vec3 rayDir;
  vec3 rayPos;
  ivec3 mapPos;

  vec3 deltaDist;
  ivec3 rayStep;
  vec3 sideDist; 

  bvec3 mask;

  float distance_traveled;
  vec3 current_real_position;
  vec3 originalDir;

  bool endedInHit;

  vec4 color;
  Complex2x2Matrix optical_objects_found_product;
  int optical_objects_through_which_it_passed;
};

// Hyperboloc functions by toneburst from 
// https://machinesdontcare.wordpress.com/2008/03/10/glsl-cosh-sinh-tanh/
// These are missing in GLSL 1.10 and 1.20, uncomment if you need them 

/*
// COSH Function (Hyperbolic Cosine)
float cosh(float val)
{
    float tmp = exp(val);
    float cosH = (tmp + 1.0 / tmp) / 2.0;
    return cosH;
}
 
// TANH Function (Hyperbolic Tangent)
float tanh(float val)
{
    float tmp = exp(val);
    float tanH = (tmp - 1.0 / tmp) / (tmp + 1.0 / tmp);
    return tanH;
}
 
// SINH Function (Hyperbolic Sine)
float sinh(float val)
{
    float tmp = exp(val);
    float sinH = (tmp - 1.0 / tmp) / 2.0;
    return sinH;
}   
*/

// Complex Number math by julesb
// https://github.com/julesb/glsl-util
// Additions by Johan Karlsson (DonKarlssonSan)

#define cx_mul(a, b) vec2(a.x*b.x-a.y*b.y, a.x*b.y+a.y*b.x)
#define cx_div(a, b) vec2(((a.x*b.x+a.y*b.y)/(b.x*b.x+b.y*b.y)),((a.y*b.x-a.x*b.y)/(b.x*b.x+b.y*b.y)))
#define cx_modulus(a) length(a)
#define cx_conj(a) vec2(a.x, -a.y)
#define cx_arg(a) atan(a.y, a.x)
#define cx_sin(a) vec2(sin(a.x) * cosh(a.y), cos(a.x) * sinh(a.y))
#define cx_cos(a) vec2(cos(a.x) * cosh(a.y), -sin(a.x) * sinh(a.y))

vec2 cx_sqrt(vec2 a) {
  float r = length(a);
  float rpart = sqrt(0.5*(r+a.x));
  float ipart = sqrt(0.5*(r-a.x));
  if (a.y < 0.0) ipart = -ipart;
  return vec2(rpart,ipart);
}

vec2 cx_tan(vec2 a) {return cx_div(cx_sin(a), cx_cos(a)); }

vec2 cx_log(vec2 a) {
    float rpart = sqrt((a.x*a.x)+(a.y*a.y));
    float ipart = atan(a.y,a.x);
    if (ipart > PI) ipart=ipart-(2.0*PI);
    return vec2(log(rpart),ipart);
}

vec2 cx_mobius(vec2 a) {
    vec2 c1 = a - vec2(1.0,0.0);
    vec2 c2 = a + vec2(1.0,0.0);
    return cx_div(c1, c2);
}

vec2 cx_z_plus_one_over_z(vec2 a) {
    return a + cx_div(vec2(1.0,0.0), a);
}

vec2 cx_z_squared_plus_c(vec2 z, vec2 c) {
    return cx_mul(z, z) + c;
}

vec2 cx_sin_of_one_over_z(vec2 z) {
    return cx_sin(cx_div(vec2(1.0,0.0), z));
}

////////////////////////////////////////////////////////////
// end Complex Number math by julesb
////////////////////////////////////////////////////////////

// My own additions to complex number math
#define cx_sub(a, b) vec2(a.x - b.x, a.y - b.y)
#define cx_add(a, b) vec2(a.x + b.x, a.y + b.y)
#define cx_abs(a) length(a)
vec2 cx_to_polar(vec2 a) {
    float phi = atan(a.y / a.x);
    float r = length(a);
    return vec2(r, phi); 
}
    
// Complex power
// Let z = r(cos θ + i sin θ)
// Then z^n = r^n (cos nθ + i sin nθ)
vec2 cx_pow(vec2 a, float n) {
    float angle = atan(a.y, a.x);
    float r = length(a);
    float real = pow(r, n) * cos(n*angle);
    float im = pow(r, n) * sin(n*angle);
    return vec2(real, im);
}

// NOTE
// matrix =
// [a b
//  c d]
Complex2x2Matrix cx_2x2_mat_mul(Complex2x2Matrix A, Complex2x2Matrix B) {
  Complex2x2Matrix resultant_mat;
  resultant_mat.a = A.a * B.a + A.b * B.c;
  resultant_mat.b = A.a * B.b + A.b * B.d;
  resultant_mat.c = A.c * B.a + A.d * B.c;
  resultant_mat.d = A.c * B.b + A.d * B.d;

  return resultant_mat;
}

Complex2x2Matrix cx_scalar_x_2x2_mat_mul(vec2 cx_scalar, Complex2x2Matrix cx_mat) {
  cx_mat.a = cx_mul(cx_scalar, cx_mat.a);
  cx_mat.b = cx_mul(cx_scalar, cx_mat.b);
  cx_mat.c = cx_mul(cx_scalar, cx_mat.c);
  cx_mat.d = cx_mul(cx_scalar, cx_mat.d);

  return cx_mat;
}

// TODO: maybe make a cx vec2 so that this is more general
Polarization cx_2x2_mat_x_cx_pol_mul(Complex2x2Matrix mat, Polarization vec) {
  Polarization result = Polarization(vec2(0, 0), vec2(0, 0));
  result.Ex = cx_add(cx_mul(mat.a, vec.Ex), cx_mul(mat.b, vec.Ey));
  result.Ey = cx_add(cx_mul(mat.c, vec.Ey), cx_mul(mat.d, vec.Ey));

  return result;
}

// vec2 cx_exp(vec2 a) {
    // float angle = atan(a.y, a.x);
    // return vec2(cos(angle), sin(angle));
// }

float computeDistance(vec3 A, vec3 B, vec3 C) {
	float x = length(cross(B - A, C - A));
	float y = length(B - A);
	return x / y;
}

bool getVoxel(ivec3 c) {
  int t = 50;
  // return abs(c.x) > t || abs(c.y) > t || abs(c.z) > t || (c.x == 10 && c.y > 25);

  return c.x < 1 || c.y < 1 || c.z < 1 || c.x > t || c.y > t || c.z > t; // || (c.x == 10 && c.y > 25);
	// return abs(c.x) > 20 || abs(c.y) > 20 || abs(c.z) > 20 || c == ivec3(5, 5, 5) || c == ivec3(5, 5, 6) || ((abs(c.x) < 2) && (c.z == 5) && false) || c == ivec3(2, 0, 0) || c == ivec3(-2, 0, 0);
	// return abs(c.x) > 20 || abs(c.y) > 20 || abs(c.z) > 20 || c.xy == ivec2(5, 5); // || c == ivec3(4, 12, 5) || c == ivec3(-4, -1, 9);
}

// Literally just iterate over the whole every possible object
OpticalObject getOpticalObject(vec3 pos) {
  for (int i = 0; i < number_of_lights; i++) {
    if (ivec3(light_positions[i]) == ivec3(pos)) {
      return OpticalObject(LIGHT, 0, vec3(0.8, 0.8, 0.8), light_positions[i]);
    }
  }

  for (int i = 0; i < number_of_optical_objects; i++) {
    if (ivec3(optical_objects_positions[i]) == ivec3(pos)) {
      return OpticalObject(PHASE_POLARIZER, i, vec3(0.8, 0.8, 0.8), optical_objects_positions[i]);
    }
  }

  return OpticalObject(NONE, 0, vec3(0), vec3(0));
}

float checker(vec3 p) {
  float t = 10.0;
  return step(0.0, sin(PI * p.x + PI/t)*sin(PI *p.y + PI/t)*sin(PI *p.z + PI/t));
}

vec3 rotate3dZ(vec3 v, float a) {
  float cosA = cos(a);
  float sinA = sin(a);
  return vec3(
    v.x * cosA - v.y * sinA,
    v.x * sinA + v.y * cosA,
    v.z
  );
}

float rayleigh_range(float z, float w0, float wavelength) {
  float n = 1.0;
  float Z_r = (PI * w0 * n) / (wavelength);
  return w0 * sqrt(1.0 + pow(z / Z_r, 2.0));
}

vec3 rotate3D(vec3 v, vec2 rotation) {
    float cos_a_x = cos(rotation.y);
    float sin_a_x = sin(rotation.y);

    float cos_a_y = cos(rotation.x);
    float sin_a_y = sin(rotation.x);

    vec3 temp_vec = vec3(
        v.x,
        v.y * cos_a_x - v.z * sin_a_x,
        v.y * sin_a_x + v.z * cos_a_x
    );

    return vec3(
        temp_vec.x * cos_a_y + temp_vec.z * sin_a_y,
        temp_vec.y,
        -temp_vec.x * sin_a_y + temp_vec.z * cos_a_y
    );
}

vec3 rotate3dY(vec3 v, float a) {
    float cosA = cos(a);
    float sinA = sin(a);
    return vec3(
        v.x * cosA + v.z * sinA,
        v.y,
        -v.x * sinA + v.z * cosA
    );
}

vec3 rotate3dX(vec3 v, float a) {
    float cosA = cos(a);
    float sinA = sin(a);
    return vec3(
        v.x,
        v.y * cosA - v.z * sinA,
        v.y * sinA + v.z * cosA
    );
}

vec2 rotate2d(vec2 v, float a) {
	float sinA = sin(a);
	float cosA = cos(a);
	return vec2(v.x * cosA - v.y * sinA, v.y * cosA + v.x * sinA);	
}

void setup_ray_direction(inout RayObject ray) {
  ray.deltaDist = 1.0 / abs(ray.rayDir);
  ray.rayStep = ivec3(sign(ray.rayDir));
  ray.sideDist = (sign(ray.rayDir) * (vec3(ray.mapPos) - ray.rayPos) + (sign(ray.rayDir) * 0.5) + 0.5) * ray.deltaDist; 
}

void step_ray(inout RayObject ray) {
  ray.mask = lessThanEqual(ray.sideDist.xyz, min(ray.sideDist.yzx, ray.sideDist.zxy));
  ray.sideDist += vec3(ray.mask) * ray.deltaDist;
  ray.mapPos += ivec3(vec3(ray.mask)) * ray.rayStep;
}

void append_to_object_stack(inout OpticalObjectStack object_stack, OpticalObject object) {
  if (object_stack.number_of_objects_hit < 10) {
    object_stack.objects_hit[object_stack.number_of_objects_hit] = object;
    object_stack.number_of_objects_hit++;
  }
}

// Steps the ray object until it hits an object
// WILL MODIFY THE RAY OBJECT
// TODO: should probably divide the wether it's trying to reach a goal or not
// into two different functions (((((maybe)))))
OpticalObject travel_to_point(inout RayObject ray, bool should_stop_at_goal, vec3 goal) {
  bool found_first_optical_object = false;
  Complex2x2Matrix aggregate_of_jones_matrices;

  for (int i = 0; i < MAX_RAY_STEPS; i++) {
    step_ray(ray);

    OpticalObject object_hit = getOpticalObject(vec3(ray.mapPos));

    // https://www.brown.edu/research/labs/mittleman/sites/brown.edu.research.labs.mittleman/files/uploads/lecture17_0.pdf page 10
    // "To model the effect of many media on light's polarization state, we use many Jones matrices."
    // "The aggregate effect of multiple components or objects can be described by the product of the Jones matrix for each one"
    // A ray passing through multiple polarizers or phase retarders can be seen the following way
    // E0 -> A1 -> A2 -> A3 -> E1
    // Where E1 is the electric field at the wall which we hit, E0 is light's original electric field
    // and An are the optical elements we hit, this can be written as:
    //
    // E1 = A3 * A2 * A1 * E0 IN THAT ORDER!!!!
    //
    // But since we are simulating everything backwards anyways (we are shooting rays from the camera and moving towards the light source)
    // we can just multiply every element we find, our process looks more like:
    //
    // -> A3 -> A2 -> A1 -> E0

    if (object_hit.type == PHASE_POLARIZER) {
      if (computeDistance(ray.current_real_position, ray.current_real_position + ray.rayDir, object_hit.pos) < 0.5) {
        ray.optical_objects_through_which_it_passed++;

        if (!found_first_optical_object) {

          aggregate_of_jones_matrices.a = jones_matrices_a[object_hit.value];
          aggregate_of_jones_matrices.b = jones_matrices_b[object_hit.value];
          aggregate_of_jones_matrices.c = jones_matrices_c[object_hit.value];
          aggregate_of_jones_matrices.d = jones_matrices_d[object_hit.value];
          aggregate_of_jones_matrices = cx_scalar_x_2x2_mat_mul(
            cx_mul(vec2(complex_coefficients[object_hit.value].x, 0), cx_exp(vec2(0, complex_coefficients[object_hit.value].y))), aggregate_of_jones_matrices
          );

          found_first_optical_object = true;

        } else {
          Complex2x2Matrix new_temp_matrix;

          new_temp_matrix.a = jones_matrices_a[object_hit.value];
          new_temp_matrix.b = jones_matrices_b[object_hit.value];
          new_temp_matrix.c = jones_matrices_c[object_hit.value];
          new_temp_matrix.d = jones_matrices_d[object_hit.value];

          aggregate_of_jones_matrices = 
            cx_2x2_mat_mul(
              cx_scalar_x_2x2_mat_mul(
                cx_mul(vec2(complex_coefficients[object_hit.value].x, 0), cx_exp(vec2(0, complex_coefficients[object_hit.value].y))), new_temp_matrix
              ),
              aggregate_of_jones_matrices
            );
        }
      }
    }

    // if this is the first ray launched and we hit a light source,
    // it will just stop so we can see the light
    if (!should_stop_at_goal && object_hit.type == LIGHT) {
      ray.distance_traveled = length(vec3(ray.mask) * (ray.sideDist - ray.deltaDist));
      ray.current_real_position = ray.rayPos + ray.rayDir * ray.distance_traveled;
      return object_hit;
    }

    // we will make optical objects a bit opaque so that we can see them
    // if (!should_stop_at_goal && (object_hit.type == PHASE_POLARIZER)) {
      // ray.optical_objects_through_which_it_passed++;
    // }

    // We reached the goal
    if (should_stop_at_goal && ivec3(ray.mapPos) == ivec3(goal)) {
      ray.distance_traveled = length(vec3(ray.mask) * (ray.sideDist - ray.deltaDist));
      ray.current_real_position = ray.rayPos + ray.rayDir * ray.distance_traveled;

      if (found_first_optical_object) {
        ray.optical_objects_found_product = aggregate_of_jones_matrices;
      }

      return OpticalObject(GOAL, 0, vec3(0), goal);
    }

    if (getVoxel(ray.mapPos)) {
      ray.distance_traveled = length(vec3(ray.mask) * (ray.sideDist - ray.deltaDist));
      ray.current_real_position = ray.rayPos + ray.rayDir * ray.distance_traveled;

      // float t = 0.5 + 0.5 * checker(dst);
      float h = 2.0 + checker(ray.current_real_position);
      ray.color *= vec4(h, h, h, 1);

      // vec4 attenuation_value = vec4(1 / pow(float(hits), 10));
      vec4 attenuation_value = vec4(1);

      if (ray.mask.x) {
          ray.color *= (vec4(0.8, 0.1, 0.1, 1.0) * attenuation_value);
      }

      if (ray.mask.y) {
          ray.color *= (vec4(0.1, 0.1, 0.8, 1.0) * attenuation_value);
      }

      if (ray.mask.z) {
          ray.color *= (vec4(0.1, 0.8, 0.1, 1.) * attenuation_value);
      }

      // ray.rayDir = reflect(ray.rayDir, vec3(ray.mask));
      // setup_ray_direction(ray);

      return OpticalObject(WALL, 0, vec3(0, 0, 0), ray.current_real_position);
    }
  }

  return OpticalObject(NONE, 0, vec3(0, 0, 0), ray.current_real_position);
}

void main() {
  vec4 color = vec4(1.);
  float anguloActualDePolarizacion = mod(t * 0.5, PI);

  vec4 fragCoord = gl_FragCoord;
  vec2 screenPos = (fragCoord.xy / viewportDimensions.xy) * 2.0 - 1.0;
  vec3 cameraDir = vec3(0.0, 0.0, 0.8);
  vec3 cameraPlaneU = vec3(1.0, 0.0, 0.0);
  vec3 cameraPlaneV = vec3(0.0, 1.0, 0.0) * viewportDimensions.y / viewportDimensions.x;
  vec3 rayDir = cameraDir + screenPos.x * cameraPlaneU + screenPos.y * cameraPlaneV;
  vec3 rayPos = position;
  vec3 realPos = position;

  rayDir = rotate3dX(rayDir, rotation.y);
  rayDir = rotate3dY(rayDir, rotation.x);

  rayDir = normalize(rayDir);

  int hits = 0;

  float r = 3.;

  float theta_rot = 0.0;
  float phi_rot = 0.0;
  float r_dist = 10000.0;

  ivec3 mapPos = ivec3(floor(rayPos + 0.));

  vec3 deltaDist = 1.0 / abs(rayDir);
  ivec3 rayStep = ivec3(sign(rayDir));
  vec3 sideDist = (sign(rayDir) * (vec3(mapPos) - rayPos) + (sign(rayDir) * 0.5) + 0.5) * deltaDist; 

  vec3 lastDeltaDist;
  ivec3 lastRayStep;
  ivec3 lastMapPos;
  vec3 lastSideDist;
  bvec3 lastMask;

  vec3 lastHitPosition;

  bvec3 mask = lessThanEqual(sideDist.xyz, min(sideDist.yzx, sideDist.zxy));

  float d;
  d = length(vec3(mask) * (sideDist - deltaDist));
  vec3 dst = rayPos + rayDir * d;

  RayObject ray;
    ray.rayDir = rayDir;
    ray.rayPos = rayPos;
    ray.mapPos = mapPos;
    ray.deltaDist = deltaDist;
    ray.rayStep = rayStep;
    ray.sideDist = sideDist;
    ray.mask = mask;
    ray.color = vec4(1.0);
    ray.distance_traveled = d;
    ray.current_real_position = dst;
    ray.optical_objects_through_which_it_passed = 0;

  // Hit any wall from the starting POV
  // TODO handle NONE return type
  OpticalObject object_hit = travel_to_point(ray, false, vec3(0));

  Polarization[10] E_lights;

  // if the first thing we hit was a light, just draw it
  if (object_hit.type == LIGHT) {
    FragColor = vec4(1);
    return;

  } else {
    for (int optical_object_index = 0; optical_object_index < number_of_lights; optical_object_index++) {
      // First check if we are in a side that's visible by the light
      if (dot(vec3(ray.mapPos) - light_positions[optical_object_index], vec3(ray.mask) * -ray.rayDir) > 0.0) {
        color *= ray.color * vec4(0.05);

      } else {
        // save the original hit position (although we wont change 
        // ray.current_real_position anyway, this is just for conciseness)
        vec3 starting_point = ray.current_real_position;

        // Create a new ray to fire to the light and set it up -----
        RayObject ray_to_light = ray;
          ray_to_light.rayPos = ray_to_light.current_real_position;
          ray_to_light.optical_objects_through_which_it_passed = 0;

          // ray_to_light.rayDir = normalize(LIGHT_OBJECTS[optical_object_index].pos - ray_to_light.rayPos);
          ray_to_light.rayDir = normalize(light_positions[optical_object_index] - ray.current_real_position);

          ray_to_light.deltaDist = abs(vec3(length(ray_to_light.rayDir)) / ray_to_light.rayDir);
          ray_to_light.rayStep = ivec3(sign(ray_to_light.rayDir));
          ray_to_light.sideDist = (sign(ray_to_light.rayDir) * (vec3(ray_to_light.mapPos) - ray_to_light.rayPos) + (sign(ray_to_light.rayDir) * 0.5) + 0.5) * ray_to_light.deltaDist;
          ray_to_light.mask = lessThanEqual(ray_to_light.sideDist.xyz, min(ray_to_light.sideDist.yzx, ray_to_light.sideDist.zxy));
        // -----

        // Try to reach a light source
        OpticalObject result = travel_to_point(ray_to_light, true, light_positions[optical_object_index]);

        // we hit the light source we were looking for
        if (result.type == GOAL) {
          color *= ray.color;

          float radius;
          float distance_from_real_light_center = 0.1;

          float z;

          // first light object is looking directly along the x axis
          // TODO: this is a bad way of doing this, the position to which the light is 
          // pointing shouldn't be written here, it should be part of a light object
          if (light_should_follow[optical_object_index]) {
            radius = computeDistance(light_positions[optical_object_index], light_look_at_position[optical_object_index], starting_point);
          // second light object is looking at the camera
          } else {
            radius = computeDistance(light_positions[optical_object_index], position, starting_point);
          }

          if (travels_fixed_distance[optical_object_index]) {
            z = travel_distance[optical_object_index];
          } else {
            z = length(light_positions[optical_object_index] - ray.current_real_position);
          }

          // Gaussian beam definition
          // TODO: this should also be part of some light definition
          float wavelength = light_wavelength[optical_object_index];
          float w0 = light_waist_radius[optical_object_index];
          float n = 1.0;
          float z_r = (PI * w0 * w0 * n) / wavelength;
          float w_z = w0 * sqrt(1.0 + pow(z / z_r, 2.0));
          float R_z = z * (1.0 + pow(z_r / z, 2.0));
          float gouy_z = atan(z / z_r);
          float k = (2.0 * PI * n) / wavelength;

          // Electric field definition
          // I just break it down into two parts for readability
          vec2 first_part_x_hat = cx_mul(light_polarizationsX[optical_object_index], vec2((w0 / w_z) * exp(-pow(radius, 2.0) / pow(w_z, 2.0)), 0));
          vec2 first_part_y_hat = cx_mul(light_polarizationsY[optical_object_index], vec2((w0 / w_z) * exp(-pow(radius, 2.0) / pow(w_z, 2.0)), 0));
          vec2 second_part = cx_exp(vec2(0.0, k * z + k * (pow(radius, 2.0) / (2.0 * R_z)) - gouy_z));

          Polarization polarization;
            polarization.Ex = cx_mul(first_part_x_hat, second_part);
            polarization.Ey = cx_mul(first_part_y_hat, second_part);

          if (ray_to_light.optical_objects_through_which_it_passed > 0) {
            polarization = cx_2x2_mat_x_cx_pol_mul(ray_to_light.optical_objects_found_product, polarization);
          }

          E_lights[optical_object_index] = polarization;

        // we hit a different light source
        } else if (result.type == LIGHT) {
          color = vec4(0.1, 0.1, 0.1, 1.);

        // the ray couldnt hit the light source
        } else {
          color *= ray_to_light.color * vec4(0.01);
        }
      }
    }
  }

  Polarization final_electric_field;
    final_electric_field.Ex = vec2(0, 0);
    final_electric_field.Ey = vec2(0, 0);

  // add up all electric fields
  for (int i = 0; i < number_of_lights; i++) {
    final_electric_field.Ex = cx_add(E_lights[i].Ex, final_electric_field.Ex);
    final_electric_field.Ey = cx_add(E_lights[i].Ey, final_electric_field.Ey);
  }

  // color *= pow(cx_abs(final_electric_field.Ex), 2) + pow(cx_abs(final_electric_field.Ey), 2) + 0.2;
  vec2 Ex = cx_pow(final_electric_field.Ex, 2.0);
  vec2 Ey = cx_pow(final_electric_field.Ey, 2.0);
  float result = cx_abs(cx_add(Ex, Ey));

  if (number_of_lights == 0) {
    color = ray.color * 0.05;
  } else {
    color *= result + (0.05 / pow(float(number_of_lights), 2.));
  }

  if (ray.optical_objects_through_which_it_passed > 0) {
    color *= pow(0.1, float(ray.optical_objects_through_which_it_passed));
  }

  FragColor = vec4(color.xyz, 1.0);
}

