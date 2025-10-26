
(() => {
"use strict";

// ======================================================
// CONFIGURATION — tweak to taste
// ======================================================
const CFG = {
  objectCount: 150,        // 🔹 Number of meshes
  spreadX: 20,             // 🔹 Horizontal distribution
  spreadY: 14,             // 🔹 Vertical distribution
  spreadZ: [8, 25],        // 🔹 Min/Max depth range
  sizeRange: [0.4, 0.8],   // 🔹 Mesh size variation
  rotationSpeed: 0.005,    // 🔹 Rotation base speed
  bloomStrength: 0.12,     // 🔹 Motion blur trail alpha (0 = clear)
  colorPalette: [          // 🔹 Soft white-blue palette
    'rgba(148, 163, 184, 0.3)',
    'rgba(100, 116, 139, 0.3)',
    'rgba(59, 130, 246, 0.25)',
    'rgba(96, 165, 250, 0.25)',
    'rgba(147, 197, 253, 0.25)',
    'rgba(191, 219, 254, 0.3)',
    'rgba(226, 232, 240, 0.35)',
    'rgba(241, 245, 249, 0.4)'
  ]
};

// ======================================================
// 3D MATH CLASSES
// ======================================================
class Vector3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  add(v){return new Vector3(this.x+v.x,this.y+v.y,this.z+v.z);}
  subtract(v){return new Vector3(this.x-v.x,this.y-v.y,this.z-v.z);}
  multiply(s){return new Vector3(this.x*s,this.y*s,this.z*s);}
  dot(v){return this.x*v.x+this.y*v.y+this.z*v.z;}
  cross(v){return new Vector3(this.y*v.z-this.z*v.y,this.z*v.x-this.x*v.z,this.x*v.y-this.y*v.x);}
  normalize(){const m=Math.sqrt(this.x**2+this.y**2+this.z**2);return m===0?new Vector3(0,0,0):new Vector3(this.x/m,this.y/m,this.z/m);}
}

class Matrix4 {
  constructor(){this.m=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
  static rotationX(a){const m=new Matrix4(),c=Math.cos(a),s=Math.sin(a);m.m[5]=c;m.m[6]=-s;m.m[9]=s;m.m[10]=c;return m;}
  static rotationY(a){const m=new Matrix4(),c=Math.cos(a),s=Math.sin(a);m.m[0]=c;m.m[2]=s;m.m[8]=-s;m.m[10]=c;return m;}
  static rotationZ(a){const m=new Matrix4(),c=Math.cos(a),s=Math.sin(a);m.m[0]=c;m.m[1]=-s;m.m[4]=s;m.m[5]=c;return m;}
  static translation(x,y,z){const m=new Matrix4();m.m[3]=x;m.m[7]=y;m.m[11]=z;return m;}
  multiply(o){const r=new Matrix4();for(let i=0;i<4;i++)for(let j=0;j<4;j++){r.m[i*4+j]=0;for(let k=0;k<4;k++)r.m[i*4+j]+=this.m[i*4+k]*o.m[k*4+j];}return r;}
  transformVector(v){const x=v.x*this.m[0]+v.y*this.m[1]+v.z*this.m[2]+this.m[3];
                     const y=v.x*this.m[4]+v.y*this.m[5]+v.z*this.m[6]+this.m[7];
                     const z=v.x*this.m[8]+v.y*this.m[9]+v.z*this.m[10]+this.m[11];
                     return new Vector3(x,y,z);}
}

class Triangle {
  constructor(v1,v2,v3){this.vertices=[v1,v2,v3];this.calculateNormal();}
  calculateNormal(){const e1=this.vertices[1].subtract(this.vertices[0]),e2=this.vertices[2].subtract(this.vertices[0]);this.normal=e1.cross(e2).normalize();}
  getCenter(){return new Vector3((this.vertices[0].x+this.vertices[1].x+this.vertices[2].x)/3,(this.vertices[0].y+this.vertices[1].y+this.vertices[2].y)/3,(this.vertices[0].z+this.vertices[1].z+this.vertices[2].z)/3);}
}

class Mesh {
  constructor(triangles=[],position=new Vector3(),rotation=new Vector3()){
    this.triangles=triangles;this.position=position;this.rotation=rotation;
    this.rotationSpeed=new Vector3((Math.random()-0.5)*CFG.rotationSpeed,(Math.random()-0.5)*CFG.rotationSpeed,(Math.random()-0.5)*CFG.rotationSpeed);
    this.color=CFG.colorPalette[Math.floor(Math.random()*CFG.colorPalette.length)];
    this.strokeColor='rgba(71,85,105,0.1)';
  }
  static createCube(s=1){
    const h=s/2,v=[new Vector3(-h,-h,-h),new Vector3(h,-h,-h),new Vector3(h,h,-h),new Vector3(-h,h,-h),
                   new Vector3(-h,-h,h),new Vector3(h,-h,h),new Vector3(h,h,h),new Vector3(-h,h,h)];
    const t=[new Triangle(v[0],v[1],v[2]),new Triangle(v[0],v[2],v[3]),new Triangle(v[4],v[6],v[5]),new Triangle(v[4],v[7],v[6]),
             new Triangle(v[0],v[4],v[5]),new Triangle(v[0],v[5],v[1]),new Triangle(v[2],v[6],v[7]),new Triangle(v[2],v[7],v[3]),
             new Triangle(v[0],v[3],v[7]),new Triangle(v[0],v[7],v[4]),new Triangle(v[1],v[5],v[6]),new Triangle(v[1],v[6],v[2])];
    return new Mesh(t);
  }
  static createTetrahedron(s=1){
    const h=s*Math.sqrt(2/3),v=[new Vector3(0,h/2,0),new Vector3(-s/2,-h/2,s/2),new Vector3(s/2,-h/2,s/2),new Vector3(0,-h/2,-s/2)];
    const t=[new Triangle(v[0],v[1],v[2]),new Triangle(v[0],v[2],v[3]),new Triangle(v[0],v[3],v[1]),new Triangle(v[1],v[3],v[2])];
    return new Mesh(t);
  }
  static createOctahedron(s=1){
    const v=[new Vector3(0,s,0),new Vector3(0,-s,0),new Vector3(s,0,0),new Vector3(-s,0,0),new Vector3(0,0,s),new Vector3(0,0,-s)];
    const t=[new Triangle(v[0],v[2],v[4]),new Triangle(v[0],v[4],v[3]),new Triangle(v[0],v[3],v[5]),new Triangle(v[0],v[5],v[2]),
             new Triangle(v[1],v[4],v[2]),new Triangle(v[1],v[3],v[4]),new Triangle(v[1],v[5],v[3]),new Triangle(v[1],v[2],v[5])];
    return new Mesh(t);
  }
  update(){this.rotation=this.rotation.add(this.rotationSpeed);}
  getTransformMatrix(){
    const rx=Matrix4.rotationX(this.rotation.x),ry=Matrix4.rotationY(this.rotation.y),rz=Matrix4.rotationZ(this.rotation.z);
    const tr=Matrix4.translation(this.position.x,this.position.y,this.position.z);
    return tr.multiply(rx.multiply(ry.multiply(rz)));
  }
}

class Camera {
  constructor(pos=new Vector3(0,0,0)){this.position=pos;this.fov=30;this.near=0.005;this.far=4;}
  project(p,canvas){
    const fov=this.fov*Math.PI/180,f=1/Math.tan(fov/2),a=canvas.width/canvas.height;
    if(p.z<=this.near)return null;
    const x=(p.x*f/a)/p.z,y=(p.y*f)/p.z;
    return {x:(x+1)*canvas.width/2,y:(-y+1)*canvas.height/2,z:p.z};
  }
}

// ======================================================
// RENDERER CLASS
// ======================================================
class Renderer3D {
  constructor(canvas){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');
    this.camera=new Camera();this.meshes=[];this.lightDirection=new Vector3(0.2,-0.3,-1).normalize();
    this.resizeCanvas();window.addEventListener('resize',()=>this.resizeCanvas());
    this.createScene();
  }

  resizeCanvas(){this.canvas.width=window.innerWidth;this.canvas.height=window.innerHeight;}

  createScene(){
    const shapes=[Mesh.createCube,Mesh.createTetrahedron,Mesh.createOctahedron];
    for(let i=0;i<CFG.objectCount;i++){
      const fn=shapes[Math.floor(Math.random()*shapes.length)];
      const mesh=fn(Math.random()*(CFG.sizeRange[1]-CFG.sizeRange[0])+CFG.sizeRange[0]);
      mesh.position=new Vector3(
        (Math.random()-0.5)*CFG.spreadX,
        (Math.random()-0.5)*CFG.spreadY,
        Math.random()*(CFG.spreadZ[1]-CFG.spreadZ[0])+CFG.spreadZ[0]
      );
      this.meshes.push(mesh);
    }
  }

  calculateLighting(n){const d=Math.max(0.2,n.dot(this.lightDirection.multiply(-1)));return 0.4+0.6*d;}

  drawTriangle(tri,color,stroke){
    const ctx=this.ctx,v1=this.camera.project(tri.vertices[0],this.canvas),v2=this.camera.project(tri.vertices[1],this.canvas),v3=this.camera.project(tri.vertices[2],this.canvas);
    if(!v1||!v2||!v3)return;
    ctx.beginPath();ctx.moveTo(v1.x,v1.y);ctx.lineTo(v2.x,v2.y);ctx.lineTo(v3.x,v3.y);ctx.closePath();
    const light=this.calculateLighting(tri.normal);
    const alpha=parseFloat(color.match(/[\d\.]+(?=\))/g).pop())*light;
    const base=color.replace(/[\d\.]+\)$/,`${alpha})`);
    ctx.fillStyle=base;ctx.fill();
    ctx.strokeStyle=stroke;ctx.lineWidth=0.3;ctx.stroke();
  }

  render(){
    this.ctx.fillStyle=`rgba(248,250,252,${CFG.bloomStrength})`;
    this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
    const tris=[];
    for(const mesh of this.meshes){
      mesh.update();
      const m=mesh.getTransformMatrix();
      for(const tri of mesh.triangles){
        const t=new Triangle(m.transformVector(tri.vertices[0]),m.transformVector(tri.vertices[1]),m.transformVector(tri.vertices[2]));
        const view=t.getCenter().subtract(this.camera.position).normalize();
        if(t.normal.dot(view)>0)continue;
        tris.push({triangle:t,color:mesh.color,stroke:mesh.strokeColor,depth:t.getCenter().z});
      }
    }
    tris.sort((a,b)=>b.depth-a.depth);
    for(const t of tris)this.drawTriangle(t.triangle,t.color,t.stroke);
    requestAnimationFrame(()=>this.render());
  }
}

// ======================================================
// RUN
// ======================================================
const canvas=document.getElementById('bgCanvas');
const renderer=new Renderer3D(canvas);
renderer.render();

})();
