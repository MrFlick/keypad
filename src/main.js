function randInt(max) {
    return Math.floor(Math.random() * max);
}

function shuffle(array) {
    // via https://stackoverflow.com/a/12646864/2372064
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

class Keypad {
    constructor(ele, gameSeconds, gameRounds) {
        this.ele = ele
        this.state = "closed"
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        window.addEventListener('resize', this.resize.bind(this));
        this.canvas.addEventListener('click', this.onclick.bind(this))
        this.symbols = new Image()
        this.symbols.src = "img/symbolst.png";
        this.setcode();

        this.clearsRequired = gameRounds || 3;
        this.clearTime = (gameSeconds*1000) || 30000;

        this.clearState = [];
        this.clickables = [];
        this.animations = [];
        this.lidState = 100;
        this.timerState = 100;
        this.explodeState = 0;
        this.timerEllapsed = 0;
        this.hasStarted = false;

        this.ele.append(this.canvas);
        this.symbols.addEventListener('load', () => this.resize())
    }

    resize() {
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const size = Math.min(vw, vh)-30;
        this.canvas.width = size;
        this.canvas.height = size;
        this.sizes = {
            paddingLeft: Math.floor(size / 9),
            buttonSize: Math.floor(size / 3),
            buttonBevel: Math.floor(size / 25),
        }
        this.sizes.paddingTop = size - this.sizes.paddingLeft - this.sizes.buttonSize * 2;
        this.draw();
    }

    setcode() {
        this.col = randInt(6);
        this.buttonSymbols = shuffle([...Array(7).keys()]).slice(0, 4);
        let code = [...this.buttonSymbols.keys()];
        code.sort((a, b) => this.buttonSymbols[a] - this.buttonSymbols[b]);
        this.code = code;
        this.pressSequence = [];
    }

    drawActionButton(pos) {
        // 0 | 2
        // 1 | 3
        const bs = this.sizes.buttonSize;
        const bev = this.sizes.buttonBevel;
        let left = this.sizes.paddingLeft;
        let top = this.sizes.paddingTop;
        if (pos==2 || pos==3) {
            left += bs;
        }
        if (pos==1 || pos==3) {
            top += bs;
        }
        const box = this.drawButton(left, top, this.sizes.buttonSize, this.sizes.buttonSize, bev);
        const pressIdx = this.pressSequence.indexOf(pos)
        if ( pressIdx == -1) {
            this.ctx.fillStyle = "black"
        } else if (this.code[pressIdx]==pos) {
            this.ctx.fillStyle = "green"
        } else {
            this.ctx.fillStyle = "red"
        }
        const indWidth = Math.floor(this.sizes.buttonSize/3)
        const indHeight = Math.floor(indWidth / 3);
        this.ctx.fillRect(left + bs/2 - indWidth/2, top+bev*1.5, indWidth, indHeight);

        if (this.symbols.complete) {
            const imgsize = bs - 2*bev - indHeight;
            const imgtop = top + bev + indHeight * 1.2;
            const imgleft = left + bs/2 - imgsize/2;
            this.ctx.drawImage(this.symbols,
                this.col*112, this.buttonSymbols[pos]*112, 112, 112,
                imgleft, imgtop, imgsize, imgsize
            )
        }
        return box
    }

    drawButton(left, top, width, height, bevel) {
        bevel = bevel || this.sizes.buttonBevel;
        this.ctx.fillStyle = "#EFE0C8";
        this.ctx.fillRect(left, top, width, height);
        this.ctx.fillStyle = "#E0D6C0";
        this.ctx.beginPath()
        this.ctx.moveTo(left, top);
        this.ctx.lineTo(left+bevel, top+bevel)
        this.ctx.lineTo(left+bevel, top+height-bevel)
        this.ctx.lineTo(left, top+height)
        this.ctx.closePath()
        this.ctx.fill()
        this.ctx.fillStyle = "#DCD2BD";
        this.ctx.beginPath()
        this.ctx.moveTo(left, top);
        this.ctx.lineTo(left+bevel, top+bevel)
        this.ctx.lineTo(left+width-bevel, top+bevel)
        this.ctx.lineTo(left+width, top)
        this.ctx.closePath()
        this.ctx.fill()
        this.ctx.fillStyle = "#726855";
        this.ctx.beginPath()
        this.ctx.moveTo(left+width, top);
        this.ctx.lineTo(left+width-bevel, top+bevel)
        this.ctx.lineTo(left+width-bevel, top+height-bevel)
        this.ctx.lineTo(left+width, top+height)
        this.ctx.closePath()
        this.ctx.fill()
        this.ctx.fillStyle = "#594E3D";
        this.ctx.beginPath()
        this.ctx.moveTo(left, top+height);
        this.ctx.lineTo(left+bevel, top+height-bevel)
        this.ctx.lineTo(left+width-bevel, top+height-bevel)
        this.ctx.lineTo(left+width, top+height)
        this.ctx.closePath()
        this.ctx.fill()
        return [left, top, left+width, top+height]
    }

    drawTimer() {
        const timerx = 9*this.canvas.width/10, timery = this.canvas.height/10;
        const outerRad = this.canvas.width/11;
        const innerRad = this.canvas.width/25;

        this.ctx.beginPath()
        this.ctx.moveTo(timerx, timery)
        this.ctx.arc(timerx, timery, outerRad,
            0, 2 * Math.PI);
        this.ctx.fillStyle = '#222222';
        this.ctx.fill();

        this.ctx.beginPath()
        this.ctx.moveTo(timerx, timery)
        this.ctx.arc(timerx, timery, outerRad,
            0-Math.PI/2, 2 * Math.PI * (this.timerState/100)-Math.PI/2);
        if (this.state == "ready") {
            this.ctx.fillStyle = 'green';
        } else {
            this.ctx.fillStyle = '#ccddff';
        }
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.moveTo(timerx, timery)
        this.ctx.arc(timerx, timery, innerRad,
            0, 2 * Math.PI);
        this.ctx.fillStyle = '#89909B';
        this.ctx.fill();
    }

    drawKeypad() {
        const boxes = []
        this.ctx.fillStyle = "#89909B";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // buttons
        for (let i = 0; i < 4; i++) {
            boxes.push([this.drawActionButton(i, 0, 0), () => this.onkeypadclick(i)]);
        }

        // round clear indicators
        const indRad = this.canvas.height/24;
        const indy =this.canvas.height/10, indx = this.canvas.width/10;
        for (let i = 0; i < this.clearsRequired; i++) {

            if (i==this.clearState) {
                this.ctx.beginPath();
                this.ctx.arc(indx + indx * i, indy, indRad,
                    0, 2 * Math.PI);
                this.ctx.fillStyle = '#222222';
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(indx + indx * i, indy, indRad/2,
                    0, 2 * Math.PI);
                this.ctx.fillStyle = '#ccddff';
                this.ctx.fill();
            } else if (i < this.clearState) {
                this.ctx.beginPath();
                this.ctx.arc(indx + indx * i, indy, indRad,
                    0, 2 * Math.PI);
                this.ctx.fillStyle = 'green';
                this.ctx.fill();
            } else {
                this.ctx.beginPath();
                this.ctx.arc(indx + indx * i, indy, indRad,
                    0, 2 * Math.PI);
                this.ctx.fillStyle = '#222222';
                this.ctx.fill();
            }


        }

        // timer
        this.drawTimer();

        return boxes;

    }

    drawLid(open) {
        let box = [];

        const left = 0, top = 0, width = this.canvas.width, height = this.canvas.height;
        const lip = height/8;
        const lid = (height/2+lip) * (1-open/100);
        const fontBase = height*.05
        const lblFont = (size) => `${size?size*fontBase:fontBase}px sans-serif`;

        this.ctx.fillStyle = "#737B87";
        this.ctx.fillRect(left, height-lid, width, height);

        this.ctx.fillStyle = "#9096A0";
        this.ctx.beginPath()
        this.ctx.moveTo(left, top-lip);
        this.ctx.lineTo(left, top+lid-lip);
        this.ctx.lineTo(left+width/2, top+lid)
        this.ctx.lineTo(left+width, top+lid-lip)
        this.ctx.lineTo(left+width, top-lip)
        this.ctx.closePath()
        this.ctx.fill()

        this.ctx.strokeStyle = "#575D67";
        this.ctx.lineWidth = 4;
        this.ctx.beginPath()
        this.ctx.lineTo(left, top+lid-lip);
        this.ctx.lineTo(left+width/2, top+lid)
        this.ctx.lineTo(left+width, top+lid-lip)
        this.ctx.stroke()

        if (!this.hasStarted) {
            const bwidth = width/2, bheight =  height/5;
            box.push(this.drawButton(width/2-bwidth/2, top+lid-lip-bheight, bwidth, bheight));
            this.ctx.font = lblFont();
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillStyle = "black";
            this.ctx.fillText("START", width/2, top+lid-lip-bheight + bheight/2)
        }
        return box;
    }

    drawBoom() {
        let box = [];
        const width = this.canvas.width, height = this.canvas.height;
        const fontBase = height*.05
        const lblFont = (size) => `${size?size*fontBase:fontBase}px sans-serif`;
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.font = lblFont(1);
        this.ctx.textAlign = "center";
        this.ctx.fillStyle = "black";
        this.ctx.fillText("You Pressed", width/2, height/2)
        this.ctx.fillText("Correct Sequence", width/2, 3*height/4)

        this.ctx.font = lblFont(2);
        this.ctx.fillStyle = "red";
        this.ctx.fillText("Bomb Exploded", width/2, 3*height/8)

        const imgSize = this.canvas.width/5;
        const imgPad = this.canvas.width/5/5

        if (this.symbols.complete) {
            let imgtop = width/2 + (width/4-width/5)/2;
            for (let i = 0; i <= this.pressSequence.length; i++) {
                const imgleft = imgPad + i * (imgSize + imgPad);
                this.ctx.drawImage(this.symbols,
                    this.col*112, this.buttonSymbols[this.pressSequence[i]]*112, 112, 112,
                    imgleft, imgtop, imgSize, imgSize
                )
            }
            imgtop = 3*height/4 + (width/4-width/5)/2;
            for (let i = 0; i <= this.code.length; i++) {
                const imgleft = imgPad + i * (imgSize + imgPad);
                this.ctx.drawImage(this.symbols,
                    this.col*112, this.buttonSymbols[this.code[i]]*112, 112, 112,
                    imgleft, imgtop, imgSize, imgSize
                )
            }
        }

        const bwidth = width/2, bheight =  height/5;
        box.push(this.drawButton(width/2-bwidth/2, bheight/3, bwidth, bheight));
        this.ctx.font = lblFont();
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillStyle = "black";
        this.ctx.fillText("TRY AGAIN", width/2, bheight/3 + bheight/2)

        return box;
    }

    drawWin() {
        let box = [];

        this.ctx.fillStyle = "orange";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const width = this.canvas.width, height = this.canvas.height;
        const fontBase = height*.05
        const lblFont = (size) => `${size?size*fontBase:fontBase}px sans-serif`;

        const bwidth = width/2, bheight =  height/5;
        box.push(this.drawButton(width/2-bwidth/2, bheight/3, bwidth, bheight));
        this.ctx.font = lblFont(1);
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillStyle = "black";
        this.ctx.fillText("PLAY AGAIN", width/2, bheight/3 + bheight/2)

        this.ctx.font = lblFont(2);
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillStyle = "black";
        this.ctx.fillText("Bomb Diffused!", width/2, height/2)

        this.ctx.font = lblFont(1);
        const timeReamin = ((this.clearTime -this.timerEllapsed)/1000).toFixed(1);
        this.ctx.fillText("Time Remaining:", width/2, 3*height/4)
        this.ctx.fillText(timeReamin + " seconds", width/2, 3*height/4 + 1.07*fontBase)

        return box;
    }

    setState(newState) {
        if (newState=="opening") {
            this.animations.push(this.openingAnimation());
        } else if (newState=="ready") {
            this.hasStarted = true;
            this.animations.push(this.timerAnimation());
        } else if (newState == "resetting") {
            this.animations.push(this.resettingAnimation());
            newState = "closing";
        } else if (newState == "defused") {
            this.state = "defused"
            this.draw();
            this.clearState += 1;
            this.setState("resetting");
            return;
        }
        this.state = newState;
    }

    draw(ts) {
        for(let i = this.animations.length-1; i >= 0; i--) {
            let isDone =  this.animations[i].tick(ts);
            if (isDone) {
                this.animations.splice(i, 1);
            }
        }
        if (this.state == "ready" || this.state == "defused") {
            this.clickables = this.drawKeypad();
        } else if (this.state == "exploded") {
            this.clickables = [[this.drawBoom()[0], () => this.restartclick()]]
        } else if (this.state == "closed") {
            this.clickables = [[this.drawLid(0)[0], () => this.startclick()]]
        } else if (this.state == "opening") {
            this.drawKeypad()
            this.drawLid(this.lidState)
        } else if (this.state == "closing") {
            this.drawLid(this.lidState)
        } else if (this.state == "won") {
            this.clickables = [[this.drawWin(0)[0], () => this.restartclick()]]
        }
        if (this.animations.length) {
            window.requestAnimationFrame((ts) => this.draw(ts))
        }
    }

    openingAnimation() {
        return this.lidAnimation(1, () => {
            this.setState("ready");
        })
    }

    resettingAnimation() {
        return this.lidAnimation(-1, () => {
            this.setcode();
            if (this.clearState >= this.clearsRequired) {
                this.setState("won");
            } else {
                this.setState("opening");
            }

        })
    }

    lidAnimation(direction, oncomplete) {
        let timeStart;
        const duration = 500;
        const game = this;
        direction = direction | 1;

        return {
            tick: (ts) => {
                if (ts === undefined) {return false;}
                if (timeStart === undefined) {
                    timeStart = ts;
                }
                const ellapsed = ts - timeStart;
                if (direction > 0) {
                    game.lidState = Math.min(100, Math.floor((ellapsed/duration) * 100));
                } else {
                    game.lidState = Math.max(0, Math.floor((1-ellapsed/duration) * 100));
                }
                if (ellapsed >= duration) {
                    if (oncomplete) {oncomplete()}
                    return true;
                }
                return false;
            }
        }
    }

    timerAnimation() {
        let lastTime;
        const game = this;

        return {
            tick: (ts) => {
                if (ts === undefined) {return false;}
                if (lastTime === undefined) {
                    lastTime = ts;
                    return false
                }
                game.timerEllapsed += ts - lastTime;
                if (game.state != "ready") {
                    return true;
                }
                lastTime = ts;
                game.timerState = Math.min(100, Math.floor((1-game.timerEllapsed/game.clearTime) * 100));
                if (game.timerEllapsed >= game.clearTime) {
                    game.setState("exploded")
                    return true;
                }
                return false;
            }
        }
    }

    onclick(e) {
        const x = e.clientX - this.canvas.offsetLeft,
            y = e.clientY - this.canvas.offsetTop;
        for (let target of this.clickables) {
            const region = target[0]
            const action = target[1]
            if (x >= region[0] && x <= region[2] && y >= region[1] && y <= region[3]) {
                action()
            }
        }
        return;

    }

    startclick() {
        this.clearState = 0;
        this.setState("opening");
        this.draw()
    }

    restartclick() {
        this.timerEllapsed = 0;
        this.timerState = 100;
        this.lidState = 100;
        this.clearState = 0;
        this.setState("resetting");
        this.draw();
    }

    onkeypadclick(button) {
        if (button != -1) {
            if (this.pressSequence.indexOf(button) == -1) {
                this.pressSequence.push(button)
                if (this.code[this.pressSequence.length-1] != button) {
                    this.setState("exploded");
                } else if (this.pressSequence.length == this.code.length) {
                    this.setState("defused");
                }
                this.draw();
            }
        }
    }
}

function init() {
    //from https://stackoverflow.com/a/901144/2372064
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });
    let gameSeconds, gameRounds;
    if (params.time) {
        const num = Number(params.time)
        if (Number.isInteger(num) && num >= 1 && num <= 60*5) {
            gameSeconds = num;
        }
    }
    if (params.rounds) {
        const num = Number(params.rounds)
        if (Number.isInteger(num) && num >= 1 && num <= 5) {
            gameRounds = num;
        }
    }
    new Keypad(document.getElementById('game'), gameSeconds, gameRounds);
}