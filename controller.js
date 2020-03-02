class PanController{ // handles panning of board

    constructor(app, grid) {
        this.app = app;
        this.grid = grid;
        let _this=this;
        this.grid.onmousedown = (e => _this.dragMouseDown(e));
        this.lastX = 0;
        this.lastY = 0;
    }
    
    elementDrag(e){
        // init drag
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
            this.app.isClickValid = true;
        }
        else{
            // big movement -> no mouse clik
            this.app.isClickValid = false;
            this.recalculateVisibleCells();
        }
    }

    dragMouseDown(e) {
        // mouse drag event
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
        // update visible grid cells: destroy out-of-window cells and fill blank space

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
            this.app.board.move(0, -numFillingCells);
            this.grid.style.top = (parseInt(this.grid.style.top.replace("px", "")) - (numFillingCells * cellWidth)) + "px";
        }

        if(leftSpace > 0){
            let numFillingCells = Math.ceil(leftSpace / cellWidth);
            this.app.board.move(-numFillingCells, 0);
            this.grid.style.left = (parseInt(this.grid.style.left.replace("px", "")) - (numFillingCells * cellWidth)) + "px";
        }

        if(bottomSpace > 0){
            let numFillingCells = Math.ceil(bottomSpace / cellWidth);
            this.app.board.move(0, numFillingCells);
            this.grid.style.top = (parseInt(this.grid.style.top.replace("px", "")) + (numFillingCells * cellWidth)) + "px";
        }

        if(rightSpace > 0){
            let numFillingCells = Math.ceil(rightSpace / cellWidth);
            this.app.board.move(numFillingCells, 0);
            this.grid.style.left = (parseInt(this.grid.style.left.replace("px", "")) + (numFillingCells * cellWidth)) + "px";
        }
    }
}

var app = new Vue({
    el: '#app',
    data: {
        status: "paused", // paused | playing
        labBtnPlayPause: "Play",
        board: new Board(28, 28),
        fps: 30,
        isClickValid: true,
        autoFit: false
    },
    mounted: function () {
        this.handleResize();
        this.pc = new PanController(this, document.getElementById("grid"));
    },
    methods: {


        loadFile: function(event){
            // load RLE file and update GUI with its content
            let file = event.target.files[0];
            let _this = this;
            let onload = function(fileContent) {
                _this.updateGUIfromRLE(fileContent);
            };
            this.readFileAsync(file, onload);
        },

        readFileAsync: function(file, onloadFunction){
            // read text file
            let reader = new FileReader();
            reader.onload = function(event) {
                // console.log(event.target.result);
                onloadFunction(reader.result);
            };
            reader.readAsText(file);
        },

        decodeRLE: function(encodedTxt){
            // parse content string of RLE file to get the set of alive cells
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

        updateGUIfromRLE(encodedTxt){
            // create visible grid from content string of RLE file
            let aliveCellsRC, maxR, maxC;
            [aliveCellsRC, maxR, maxC] = this.decodeRLE(encodedTxt); 
            
            [maxC, maxR] = this.correctSize(maxC, maxR);

            this.board.setContent(aliveCellsRC);
            this.board.setTopCorner(0, 0);
            this.board.setDimension(maxC, maxR);

            document.getElementById("grid").style.top = "0px";
            document.getElementById("grid").style.left = "0px";
        },

        correctSize(preferredWidth, preferredHeight){
            // correct the size: enlarge the too-small dimension
            let cellWidth = window.innerWidth / preferredWidth;
            let h = window.innerHeight-document.querySelector("nav").clientHeight;
            let cellHeight = h / preferredHeight;
            if(cellWidth > cellHeight)
                preferredWidth = Math.ceil(window.innerWidth / cellHeight);
            else if(cellHeight > cellWidth)
                preferredHeight = Math.ceil(h / cellWidth);
            return [preferredWidth, preferredHeight];
        },

        load: function(){
            let select = document.querySelector("#selectLoad");
            if(select.selectedIndex == 0)
                return;
            let fileName = "rle/" + select.value + ".rle";
            
            let _this = this;
            let request = new XMLHttpRequest();
            request.open("GET", fileName, true);
            request.onreadystatechange = function ()
            {
                if(request.readyState === 4)
                {
                    if(request.status === 200 || request.status == 0)
                    {
                        _this.updateGUIfromRLE(request.responseText);
                    }
                }
            }
            request.send(null);
        },

        playPauseClick: function(){
            if(this.status === "paused"){
                this.startPlaying();
            }
            else if(this.status === "playing"){
                this.stopPlaying();
            }
        },

        startPlaying: function(){
            // start animation
            this.status = "playing";
            this.labBtnPlayPause = "Pause";
            this.gameStep();
        },

        gameStep: function(repeat=true){
            // do Game of Life step

            let start = performance.now();
            this.board.step();
            let waitingTime = Math.floor(1000/this.fps);
            // console.log(waitingTime)
            let elapsed = performance.now() - start;
            if(this.autoFit)
                this.autoFitGrid();
            waitingTime = Math.max(0, waitingTime-elapsed);
            if(repeat && this.status == "playing")
                setTimeout(this.gameStep, waitingTime);
        },

        stopPlaying: function(){
            // pause animation
            this.status = "paused";
            this.labBtnPlayPause = "Play";
        },

        cellClick: function(cell){
            if(this.isClickValid)  // click is valid if not dragging the grid
                cell.toggleStatus();
        },

        clearClick: function(){
            // clear the grid
            this.stopPlaying();
            this.board.clear();
        },

        autoFitChanged(){
            if(this.autoFit)
                this.autoFitGrid();
        },

        autoFitGrid(){
            // automatically move and resize visible grid
            let minC=null, maxC=null, minR=null, maxR=null;
            let first = true;
            // search for grid limits
            for (let pair of this.board.aliveCellsRC) {
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
                } else if (pair[0] > maxR){
                    maxR = pair[0];
                }
                if (pair[1] < minC) {
                    minC = pair[1];
                } else if (pair[1] > maxC) {
                    maxC = pair[1];
                }
            }

            if(minC == null){ // if there are no alive cells
                minR = 0;
                maxR = 0;
                minC = 0;
                maxC = 0;
            }

            let tcX = minC-2, tcY = minR-2;
            
            // to avoid to many changes in visible grid position
            if(1 <= tcX - this.board.topLeftCornerX && tcX - this.board.topLeftCornerX <=3)
                tcX = this.board.topLeftCornerX;
            if(1 <= tcY - this.board.topLeftCornerY && tcY - this.board.topLeftCornerY <=3)
                tcY = this.board.topLeftCornerY;

            this.board.setTopCorner(tcX, tcY);
            let width, height;
            [width, height] = this.correctSize(maxC - minC + 5, maxR - minR + 5);
            
            // to avoid to many changes in visible grid dimension
            if(1 <= this.board.visibleWidth - width && this.board.visibleWidth - width <=6)
                width = this.board.visibleWidth;
            if(1 <= this.board.visibleHeight - height && this.board.visibleHeight - height <=6)
                height = this.board.visibleHeight;

            this.board.setDimension(width, height);
        },

        handleWheel: function(event){
            // mouse wheel -> change zoom
            var y = event.deltaY;
            if(y == 0)
                return;
            let factor = 2 * Math.min(4, Math.max(1, Math.round(this.board.visibleWidth / 40)));
            if (y <= 0) {
                // wheel up, more zoom
                if(this.board.visibleWidth <= 6)
                    return;
                factor *= -1;
            }
            this.board.visibleWidth += factor;
            this.board.topLeftCornerX -= factor/2;
            this.board.topLeftCornerY -= factor/2;
            this.handleResize();
            this.board.updateVisibleGrid();
        },

        handleResize: function(){
            // calculate grid height from grid width
            let h = window.innerHeight-document.querySelector("nav").clientHeight;
            this.board.visibleHeight = Math.ceil(h / document.querySelector(".dead").clientHeight);
            this.board.updateVisibleGrid();
        },

        setTheme(theme){
            // change theme
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
