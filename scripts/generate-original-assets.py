from PIL import Image, ImageDraw, ImageFilter
import numpy as np, random, math, wave
random.seed(42)
w,h=1080,1920
y,x=np.mgrid[:h,:w].astype('float32')
t=np.clip(y/1450,0,1)
p=np.exp(-(((x-731)/670)**2+((y-897)/625)**2)*1.8)
base=np.stack([12+174*p+12*t,8+48*p+8*t,28+58*p+16*t],axis=-1)
fog=np.maximum(0,np.sin(y*.043+np.sin(x*.007)*1.5))*np.exp(-((y-852)/340)**2)*8
base+=fog[:,:,None]*np.array([1,.58,.44])
base+=np.random.default_rng(12).normal(0,1.6,(h,w,1))
im=Image.fromarray(np.uint8(np.clip(base,0,255)))
d=ImageDraw.Draw(im,'RGBA')
for i in range(250):
    a,b=random.randrange(w),random.randrange(785)
    d.point((a,b),fill=(255,196,212,random.randrange(20,160)))
sun=(510,627,1008,1125)
d.ellipse(sun,fill=(255,145,104,235))
for row in range(723,1125,12):
    span=math.sqrt(max(0,249**2-(row-876)**2))
    d.rectangle((759-span,row,759+span,row+int(2+(row-723)/73)),fill=(117,37,85,100))
for j,(ground,color) in enumerate([(1200,(42,21,54)),(1325,(20,17,39)),(1405,(11,12,26))]):
    pos=-25
    while pos<w:
        bw=random.randrange(25,78)
        top=ground-random.randrange(65,265)
        if random.random()<.24:
            d.rectangle((pos+bw*.29,top-18,pos+bw*.67,top),fill=color)
            d.line((pos+bw*.48,top-40,pos+bw*.48,top),fill=color,width=2)
        d.rectangle((pos,top,pos+bw,ground),fill=color)
        for xx in range(pos+8,pos+bw-4,9):
            for yy in range(top+12,ground-8,13):
                if random.random()<.27:
                    d.rectangle((xx,yy,xx+2,yy+3),fill=random.choice([(246,147,128,121),(133,135,224,117),(253,194,142,101)]))
        pos+=bw+random.randrange(3,13)
d.rectangle((0,1405,w,h),fill=(13,12,30))
for i in range(810):
    yy=random.randrange(1408,h)
    xx=random.randrange(w)
    focus=max(0,1-abs(xx-740)/620)
    d.line((xx,yy,xx+random.randrange(3,70),yy),fill=(243,109,138,int(random.randrange(11,82)*focus)),width=random.choice((1,1,2)))
def palm(bx,by,tx,ty,s):
    d.line([(bx,by),((bx+tx)/2-16,(by+ty)/2),(tx,ty)],fill=(8,9,23),width=int(19*s))
    for angle in [-2.9,-2.55,-2.14,-1.62,-.98,-.41,.2,.65,2.8]:
        l=random.uniform(100,265)*s
        path=[(tx+math.cos(angle)*l*t,ty+math.sin(angle)*l*t+100*s*t*t) for t in np.linspace(0,1,22)]
        d.line(path,fill=(8,9,23),width=max(2,int(6*s)))
        for k,(px,py) in enumerate(path[2:-1],2):
            spread=math.sin(math.pi*k/22)*46*s
            for side in (-1,1):
                a=angle+side*.92
                d.line((px,py,px+spread*math.cos(a),py+spread*math.sin(a)+13*s),fill=(8,9,23),width=max(2,int(3*s)))
palm(70,1505,133,1032,1.11)
palm(1110,1528,1005,1120,.79)
palm(9,1460,20,1210,.55)
im.save('public/original-skyline.jpg',quality=91,optimize=True)

rate=44100
def write(name,samples):
    stereo=np.column_stack((samples,np.roll(samples,12)))
    stereo[:12,1]=0
    with wave.open('public/'+name,'wb') as f:
        f.setparams((2,2,rate,0,'NONE','not compressed'))
        f.writeframes((np.clip(stereo,-1,1)*32767).astype('<i2').tobytes())
t=np.arange(int(rate*.48))/rate
rng=np.random.default_rng(24)
sweep=np.sin(2*np.pi*(45*t+4*(1-np.exp(-t*15))))*np.exp(-t*12)
noise=np.convolve(rng.normal(0,1,len(t)),np.ones(14)/14,mode='same')
write('original-cue.wav',(sweep*.63+noise*.32*np.exp(-t*19))*np.minimum(t*150,1)*np.minimum((.48-t)*36,1))
t=np.arange(rate*4)/rate
pad=sum(np.sin(2*np.pi*f*t)*amp for f,amp in [(55,.19),(82.5,.075),(110,.074),(131,.045),(165,.032),(262,.025)])
pulse=(.7+.3*np.cos(2*np.pi*t*2))
write('original-bed.wav',pad*pulse*np.minimum(t*8,1)*np.minimum((4-t)*8,1))
