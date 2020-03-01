class Cell {
    constructor(status, row, column){
        if(status === 0)
            status = "dead";
        else if (status === 1)
            status = "alive";

        this.status = status;
        this.row = row;
        this.column = column;
        this.observers = [];
    }

    click() {
        if(!validClick)
            return;
        this.toggleStatus();
    }

    toggleStatus() {
        if (this.status == "dead")
            this.status = "alive";
        else
            this.status = "dead";
        this._notifyObservers();
        return this;
    }

    subscribe(observer){
        this.observers.push(observer);
        return this;
    }

    unsubscribe(observer){
        let i = this.observers.indexOf(observer);
        if(i != -1)
            this.observers.splice(i, 1);
        return this;
    }

    _notifyObservers(){
        for (const observer of this.observers) {
            observer.update(this);
        }
    }

}


class Board{
    constructor(/*maxWidth, maxHeight, */visibleWidth, visibleHeight){
        // this.maxWidth = maxWidth;
        // this.maxHeight = maxHeight;

        this.topLeftCornerX = 0;
        this.topLeftCornerY = 0;
        this.visibleHeight = visibleHeight;
        this.visibleWidth = visibleWidth;

        this._aliveCellsRC = new Set();
        this.visibleGrid = [];
        this._updateVisibleGrid();
        this.fps = 30;
        this.autoFit = false;
    }

    _updateVisibleGrid(){
        if(this.autoFit){
            let minC, maxC, minR, maxR;
            let first = true;
            for (let pair of this._aliveCellsRC) {
                pair = JSON.parse(pair);
                if(first){
                    first = false;
                    minR = pair[0];
                    maxR = pair[0];
                    minC = pair[1];
                    maxC = pair[1];
                }
                if (pair[0] < minR) {
                    minR = pair[0];
                } else {
                    maxR = pair[0];
                }
                if (pair[1] < minC) {
                    minC = pair[1];
                } else {
                    maxC = pair[1];
                }
            }
            this.topLeftCornerX = minC;
            this.topLeftCornerY = minR;
            this.visibleWidth = maxC - minC + 1;
            this.visibleHeight = maxR - minR + 1;
        }

        let tx = this.topLeftCornerX;
        let ty = this.topLeftCornerY;
        let vw = this.visibleWidth;
        let vh = this.visibleHeight;
        
        let newVisibleGrid = [];
        for (let r = ty; r < ty + vh; r++) {
            let row = [];
            for (let c = tx; c < tx + vw; c++) {
                row.push(new Cell("dead", r, c).subscribe(this));
            }
            newVisibleGrid.push(row);
        }
        for (let pair of this._aliveCellsRC) {
            pair = JSON.parse(pair);
            let cy = pair[0] - ty;
            let cx = pair[1] - tx;
            if (cx < 0 || cx >= vw || cy < 0 || cy >= vh) continue;
            newVisibleGrid[cy][cx].toggleStatus();
        }
        this.visibleGrid = newVisibleGrid;
    }

    update(cell){
        let jsonPosition = JSON.stringify([cell.row, cell.column]);
        if(cell.status == "alive"){
            if(!(this._aliveCellsRC.has(jsonPosition)))
                this._aliveCellsRC.add(jsonPosition);
        } else {
            if(this._aliveCellsRC.has(jsonPosition))
                this._aliveCellsRC.delete(jsonPosition);
        }
    }

    step(){
        if(this.status === "paused")
            return;

        // calculate number of neighbors
        let numNeighbors = {};
        for (const pair of this._aliveCellsRC) {
            let pairNeighbors = this._getNeighbors(pair);
            for(const neigh of pairNeighbors){
                if(numNeighbors[neigh] == undefined)
                    numNeighbors[neigh] = 0;
                numNeighbors[neigh]++;
            }
        }

        // set new alive cells
        let newAliveCellsRC = new Set();
        for (let pair in numNeighbors) {
            let num = numNeighbors[pair];
            if(num == 3 || (num == 2 && this._aliveCellsRC.has(pair)))
                newAliveCellsRC.add(pair);
        }
        this._aliveCellsRC = newAliveCellsRC;

        // update visible grid
        this._updateVisibleGrid();
    }

    clear(){
        this._aliveCellsRC = new Set();
        this._updateVisibleGrid();
    }

    _getNeighbors(pair){
        pair = JSON.parse(pair);
        let neighbors = [];

        for (let i = -1; i <= 1; i++){
            for (let j = -1; j <= 1; j++){
                if(i == 0 && i == j)
                    continue;
                let r = pair[0]+i;
                let c = pair[1]+j;
                // if(r >= 0 && r < this.maxHeight && c >= 0 && c < this.maxWidth)
                neighbors.push(JSON.stringify([r, c]));
            }
        }

        return neighbors;
    }

    setContent(aliveCellsRC){
        this._aliveCellsRC = aliveCellsRC;
        this._updateVisibleGrid();
    }
    setTopCorner(x, y){
        this.topLeftCornerX = x;
        this.topLeftCornerY = y;
        this._updateVisibleGrid();
    }
    setDimension(maxR, maxC){
        this.visibleWidth = maxC;
        this.visibleHeight = maxR;
        this._updateVisibleGrid();
    }

    move(deltaX, deltaY){
        this.topLeftCornerX += deltaX;
        this.topLeftCornerY += deltaY;
        this._updateVisibleGrid();
    }

    changeDimension(deltaWidht, deltaHeight){
        this.visibleWidth += deltaWidht;
        this.visibleHeight += deltaHeight;
        this._updateVisibleGrid();
    }

    autoFitChanged(){
        if(this.autoFit)
            this._updateVisibleGrid();
    }

}


var app = new Vue({
    el: '#app',
    data: {
        status: "paused", // paused | playing
        header: "Conway's Game of Life",
        labBtnPlayPause: "Play",
        board: new Board(/*1024, 1024, */7, 7),
        padding: 20,
        fps: 30
    },
    created: function () {
        
    },
    mounted: function () {
        this.handleResize();
    },
    methods: {


        loadFile: function(event){
            let file = event.target.files[0];
            let _this = this;
            let onload = function(fileContent) {
                let aliveCellsRC, maxR, maxC;
                [aliveCellsRC, maxR, maxC] = _this.decodeRLE(fileContent); 
                let cellWidth = window.innerWidth / maxC;
                let h = window.innerHeight-document.querySelector("header").clientHeight-document.querySelector("nav").clientHeight;
                let cellHeight = h / maxR;
                if(cellWidth > cellHeight)
                    maxC = Math.ceil(window.innerWidth / cellHeight);
                else if(cellHeight > cellWidth)
                    maxR = Math.ceil(h / cellWidth);

                _this.board.setContent(aliveCellsRC);
                _this.board.setTopCorner(0, 0);
                _this.board.setDimension(maxR, maxC);

                document.getElementById("grid").style.top = "0px";
                document.getElementById("grid").style.left = "0px";

                // _this.rows = _this.pad(decodedContent.map(r => r.map(num => new Cell(num))), _this.padding);
            };
            this.readFileAsync(file, onload);
        },
        readFileAsync: function(file, onloadFunction){
            let reader = new FileReader();
            reader.onload = function(event) {
                // console.log(event.target.result);
                onloadFunction(reader.result);
            };
            reader.readAsText(file);
        },
        decodeRLE: function(encodedTxt){
            let lines = encodedTxt.split("\n");

            l = -1;
            do{
                line = lines[++l];
            }while(line.trim()[0] === "#");
            line = lines[l++];
            let [x, y, rule] = line.split(",").map(token => token.split("=")[1].trim());
            let width = parseInt(x);
            let height = parseInt(y);
            
            let rle = lines.slice(l).join("").trim();
            let aliveCellsRC = new Set();
            let runLength = 1;
            let r = 0; let c = 0;
            while (rle !== ""){
                const symbolRegex = /[o,b,!,$]/;
                const numberRegex = /[0-9]+/;
                let nextNonNumber = rle.search(symbolRegex);
                let token;
                if (nextNonNumber === 0){
                    token = rle[0];
                    rle = rle.substr(1);
                } else {
                    token = rle.substr(0, nextNonNumber);
                    rle = rle.substr(nextNonNumber);
                }

                if(token.search(symbolRegex) == -1 && token.search(numberRegex) == -1)
                    continue;

                switch(token){
                    case 'b':
                        console.assert(runLength > 0);
                        for (let i=0; i<runLength; i++)
                            c++;
                        runLength = 1;
                        break;
                    case 'o':
                        console.assert(runLength > 0);
                        for (let i=0; i<runLength; i++)
                            aliveCellsRC.add(JSON.stringify([r, c++]));
                        runLength = 1;
                        break;
                    case '!':
                        console.assert(rle === "");
                    case '$':
                        console.assert(c <= width);
                        c = 0;
                        for(let i=0; i<runLength; i++)
                            r++;
                        runLength = 1;
                        break;
                    default:
                        console.assert(token.match(numberRegex));
                        // token is an integer
                        runLength = parseInt(token);
                }
            }
            return [aliveCellsRC, height, width];
        },
        pad: function(grid, padding){
            let paddingLeft, paddingRight, paddingTop, paddingBottom;
            if(padding.length == undefined){ // padding is a number
                paddingLeft = padding; paddingRight = padding; paddingTop = padding; paddingBottom = padding;
            } else { // padding is an array
                console.assert(padding.length == 2 || padding.length == 4);
                if(padding.length == 2){
                    paddingLeft = padding[0]; paddingRight = padding[0];
                    paddingTop = padding[1]; paddingBottom = padding[1];
                } else {
                    paddingTop = padding[0];
                    paddingRight = padding[1];
                    paddingBotton = padding[2];
                    paddingLeft = padding[3];
                }
            }

            let width = grid[0].length;
            
            // pad horizontally
            grid = grid.map(row => new Array(paddingLeft).fill(0).map(_ => new Cell("dead")).concat(row).concat(new Array(paddingRight).fill(0).map(_ => new Cell("dead"))));
            
            // pad top and bottom
            let newWidth = width + paddingLeft + paddingRight;

            for (let i = 0; i < paddingTop; i++){
                grid.unshift(new Array(newWidth).fill(0).map(_ => new Cell("dead")));
            }

            for (let i = 0; i < paddingBottom; i++){
                grid.push(new Array(newWidth).fill(0).map(_ => new Cell("dead")));
            }

            return grid;
        },
        
        // _loadFile: function(){
        //     rows = this.readRLE_Path('114p6h1v0pushalong2.rle')
        // },
        // readRLE_Path: function(filePath){
        //     var file = new File([""], filePath, {type: "text/plain"});
        //     console.log(filePath);
        // },

        playPauseClick: function(){
            if(this.status === "paused"){
                this.startPlaying();
            }
            else if(this.status === "playing"){
                this.stopPlaying();
            }
        },

        startPlaying: function(){
            this.status = "playing";
            this.labBtnPlayPause = "Pause";
            this.gameStep();
        },

        gameStep: function(){
            if(this.status == "paused")
                return;
            let start = performance.now();

            this.board.step();

            let waitingTime = Math.floor(1000/this.fps);
            // console.log(waitingTime)
            let elapsed = performance.now() - start;
            waitingTime = Math.max(0, waitingTime-elapsed);
            setTimeout(this.gameStep, waitingTime);
        },

        stopPlaying: function(){
            this.status = "paused";
            this.labBtnPlayPause = "Play";
        },

        clearClick: function(){
            this.stopPlaying();
            this.board.clear();
        },

        handleWheel: function(event){
            var y = event.deltaY;
            if (y > 0) {
                // wheel down, less zoom
                this.board.visibleWidth += 2;
                this.board.visibleHeight += 2;
                this.board.topLeftCornerX -= 1;
                this.board.topLeftCornerY -= 1;
            } else {
                
                if(this.board.visibleWidth <= 2 || this.board.visibleHeight <= 2)
                    return;

                // wheel up, more zoom
                this.board.visibleHeight -= 2;
                this.board.visibleWidth -= 2;
                this.board.topLeftCornerX += 1;
                this.board.topLeftCornerY += 1;

                // this.board.visibleWidth = Math.max(this.board.visibleWidth, 1);
                // this.board.visibleHeight = Math.max(this.board.visibleHeight, 1);
            }
            this.board._updateVisibleGrid();
        },

        handleResize: function(){
            let h = window.innerHeight-document.querySelector("header").clientHeight-document.querySelector("nav").clientHeight;
            this.board.visibleHeight = Math.ceil(h / document.querySelector(".dead").clientHeight);
            this.board._updateVisibleGrid();
        },

        setTheme(theme){
            let root = document.documentElement;
            switch(theme){
                case "Blue":
                    root.style.setProperty('--dark-color', "#001970");
                    root.style.setProperty('--main-color', "#303f9f");
                    root.style.setProperty('--light-color', "#666ad1");
                    break;
                case "Green":
                    root.style.setProperty('--dark-color', "#004c40");
                    root.style.setProperty('--main-color', "#00796b");
                    root.style.setProperty('--light-color', "#48a999");
                    break;
                case "Purple":
                    root.style.setProperty('--dark-color', "#7b1fa2");
                    root.style.setProperty('--main-color', "#ae52d4");
                    root.style.setProperty('--light-color', "#d05ce3");
                    break;
            }

        }
        
    },
});

class GridController{
    constructor(grid) {
        this.grid = grid;
        let _this=this;
        this.grid.onmousedown = (e => _this.dragMouseDown(e));
        this.lastX = 0;
        this.lastY = 0;
    }
    
    elementDrag(e){
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        this.deltaMouseX = this.mouseX - e.clientX;
        this.deltaMouseY = this.mouseY - e.clientY;
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        // set the element's new position:
        this.grid.style.top = (this.grid.offsetTop - this.deltaMouseY) + "px";
        this.grid.style.left = (this.grid.offsetLeft - this.deltaMouseX) + "px";

        let eps = 80;
        if(Math.abs(this.mouseX - this.lastX) > eps || Math.abs(this.mouseY - this.lastY) > eps)
            this.recalculateVisibleCells();
    }

    closeDragElement() {
        // stop moving when mouse button is released
        document.onmouseup = null;
        document.onmousemove = null;

        // enable/disable click on cells
        let eps = 0;
        if(Math.abs(this.mouseX-this.firstMouseX) <= eps && Math.abs(this.mouseY-this.firstMouseY) <= eps){
            // little movement -> mouse click
            validClick = true;
        }
        else{
            // big movement -> no mouse clik
            validClick = false;
            this.recalculateVisibleCells();
        }
    }

    dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();

        // get the mouse cursor position at startup:
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        this.firstMouseX = this.mouseX;
        this.firstMouseY = this.mouseY;

        this.lastX = this.mouseX;
        this.lastY = this.mouseY;

        // bind move and release events
        let _this=this;
        document.onmouseup = (_ => _this.closeDragElement()); // when mouse is released
        document.onmousemove = (e => _this.elementDrag(e)); // whenever the mouse moves
    }

    recalculateVisibleCells(){

        this.lastX = this.mouseX;
        this.lastY = this.mouseY;

        let gridRect = this.grid.getBoundingClientRect();
        let cellWidth = document.querySelector(".dead").clientWidth;

        let topSpace = gridRect.top - document.getElementById("gridContainer").getBoundingClientRect().top;
        let leftSpace = gridRect.left - document.getElementById("gridContainer").getBoundingClientRect().left;
        let bottomSpace = window.innerHeight - gridRect.bottom;
        let rightSpace = window.innerWidth - gridRect.right;

        if(topSpace > 0){
            let numFillingCells = Math.ceil(topSpace / cellWidth);
            app.board.move(0, -numFillingCells);
            this.grid.style.top = (parseInt(this.grid.style.top.replace("px", "")) - (numFillingCells * cellWidth)) + "px";
        }

        if(leftSpace > 0){
            let numFillingCells = Math.ceil(leftSpace / cellWidth);
            app.board.move(-numFillingCells, 0);
            this.grid.style.left = (parseInt(this.grid.style.left.replace("px", "")) - (numFillingCells * cellWidth)) + "px";
        }

        if(bottomSpace > 0){
            let numFillingCells = Math.ceil(bottomSpace / cellWidth);
            app.board.move(0, numFillingCells);
            this.grid.style.top = (parseInt(this.grid.style.top.replace("px", "")) + (numFillingCells * cellWidth)) + "px";
        }

        if(rightSpace > 0){
            let numFillingCells = Math.ceil(rightSpace / cellWidth);
            app.board.move(numFillingCells, 0);
            this.grid.style.left = (parseInt(this.grid.style.left.replace("px", "")) + (numFillingCells * cellWidth)) + "px";
        }
    }
}

var gc = new GridController(document.getElementById("grid"));
var validClick = false;