var app = new Vue({
    el: '#app',
    data: {
        status: "paused", // paused | playing
        header: "Conway's Game of Life",
        labBtnPlayPause: "Play",
        rows: [
            [new Cell("alive"), new Cell("dead"), new Cell("dead"), new Cell("dead"), new Cell("alive")],
            [new Cell("dead"), new Cell("dead"), new Cell("dead"), new Cell("alive"), new Cell("dead")],
            [new Cell("alive"), new Cell("dead"), new Cell("alive"), new Cell("dead"), new Cell("dead")],
            [new Cell("alive"), new Cell("alive"), new Cell("dead"), new Cell("dead"), new Cell("alive")]
        ],
        padding: 20
    },
    methods: {
        loadFile: function(event){
            console.log(event.target);
            let file = event.target.files[0];
            let _this = this;
            let onload = function(fileContent) {
                let decodedContent = _this.decodeRLE(fileContent); 
                _this.rows = _this.pad(decodedContent.map(r => r.map(num => new Cell(num))), _this.padding);
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
            let matrix = [];
            let row = [];
            let runLength = 1;
            while (rle !== ""){
                const regex = /[o,b,!,$]/;
                let nextNonNumber = rle.search(regex);
                let token;
                if (nextNonNumber === 0){
                    token = rle[0];
                    rle = rle.substr(1);
                } else {
                    token = rle.substr(0, nextNonNumber);
                    rle = rle.substr(nextNonNumber);
                }
                switch(token){
                    case 'b':
                        console.assert(runLength > 0);
                        for (let i=0; i<runLength; i++)
                            row.push(0);
                        runLength = 1;
                        break;
                    case 'o':
                        console.assert(runLength > 0);
                        for (let i=0; i<runLength; i++)
                            row.push(1);
                        runLength = 1;
                        break;
                    case '!':
                        console.assert(rle === "");
                    case '$':
                        console.assert(row.length <= width);
                        for(let i=row.length; i<width; i++)
                            row.push(0);
                        matrix.push(row);
                        for(let i=1; i<runLength; i++)
                            matrix.push(new Array(width).fill(0));
                        row = [];
                        runLength = 1;
                        break;
                    default:
                        console.assert(token.match(/[0-9]+/));
                        // token is an integer
                        runLength = parseInt(token);
                }
            }
            console.assert(matrix.length === height);
            return matrix;
        },
        pad: function(rows, padding){
            let width = rows[0].length;
            
            // pad horizontally
            rows = rows.map(row => new Array(padding).fill(0).map(_ => new Cell("dead")).concat(row).concat(new Array(padding).fill(0).map(_ => new Cell("dead"))));
            
            // pad top and bottom
            let newWidth = width + 2 * padding;

            for (let i = 0; i < padding; i++){
                rows.unshift(new Array(newWidth).fill(0).map(_ => new Cell("dead")));
                rows.push(new Array(newWidth).fill(0).map(_ => new Cell("dead")));
            }

            return rows;
        },
        
        // _loadFile: function(){
        //     rows = this.readRLE_Path('114p6h1v0pushalong2.rle')
        // },
        // readRLE_Path: function(filePath){
        //     var file = new File([""], filePath, {type: "text/plain"});
        //     console.log(filePath);
        // },

        playPauseClick: function(){
            console.log("pp pressed");
            console.log(this.status);
            if(this.status === "paused"){
                this.startPlaying();
            }
            else if(this.status === "playing"){
                this.stopPlaying();
            }
        },

        startPlaying: function(){
            console.log("begin playing");
            this.status = "playing";
            this.labBtnPlayPause = "Pause";
            this.gameStep();
        },

        gameStep: function(){
            let start = performance.now();
            if(this.status === "paused")
                return;

            let height = this.rows.length;
            let width = this.rows[0].length;

            let newRows = new Array(height).fill(0).map(_ =>new Array(width).fill(0));

            
            let outStr = "";
            for (let r = 0; r < height; r++) {
                outStr += newRows[r].join(",");
                outStr += "\n"
            }
            // console.log(outStr);

            // central cells
            for (let r = 1; r < height-1; r++) {
                for (let c = 1; c < width-1; c++) {
                    if(this.rows[r][c].status[0] === "d") // dead
                        continue;

                    for (let i = -1; i < 2; i++) {
                        for (let j = -1; j < 2; j++) {
                            if(i === j && i === 0)
                                continue;
                            newRows[r+i][c+j]++;
                        }
                    }
                }
            }

            // first row and last row
            for (let c = 1; c < width-1; c++) {
                if(this.rows[0][c].status[0] === "a") // alive
                    for (let i = 0; i < 2; i++)
                        for (let j = -1; j < 2; j++) {
                            if(i === j && i === 0)
                                continue;
                            newRows[i][c+j]++;
                        }
                
                if(this.rows[height-1][c].status[0] === "a") // alive
                    for (let i = -1; i < 1; i++)
                        for (let j = -1; j < 2; j++) {
                            if(i === j && i === 0)
                                continue;
                            newRows[height-1+i][c+j]++;
                        }
            }

            // first column and last column
            for (let r = 1; r < height-1; r++) {
                if(this.rows[r][0].status[0] === "a") // alive
                    for (let i = -1; i < 2; i++)
                        for (let j = 0; j < 2; j++) {
                            if(i === j && i === 0)
                                continue;
                            newRows[r+i][j]++;
                        }
                
                if(this.rows[r][width-1].status[0] === "a") // alive
                    for (let i = -1; i < 2; i++)
                        for (let j = -1; j < 1; j++) {
                            if(i === j && i === 0)
                                continue;
                            newRows[r+i][width-1+j]++;
                        }
            }

            // four corners
            if(this.rows[0][0].status[0] === "a"){ // alive
                newRows[0][1]++; newRows[1][1]++; newRows[1][0]++;
            }
            if(this.rows[0][width-1].status[0] === "a"){ // alive
                newRows[0][width-2]++; newRows[1][width-2]++; newRows[1][width-1]++;
            }
            if(this.rows[height-1][0].status[0] === "a"){ // alive
                newRows[height-2][0]++; newRows[height-2][1]++; newRows[height-1][1]++;
            }
            if(this.rows[height-1][width-1].status[0] === "a"){ // alive
                newRows[height-1][width-2]++; newRows[height-2][width-2]++; newRows[height-2][width-1]++;
            }

            outStr = "";
            for (let r = 0; r < height; r++) {
                outStr += newRows[r].join(",");
                outStr += "\n"
            }
            // console.log(outStr);

            // create new grid using Game of Life rules
            for (let r = 0; r < height; r++) {
                for (let c = 0; c < width; c++) {
                    let numNeighbors = newRows[r][c];
                    if(numNeighbors === 3 || (numNeighbors === 2 && this.rows[r][c].status[0] == "a"))
                        newRows[r][c] = new Cell("alive");
                    else
                        newRows[r][c] = new Cell("dead");
                }
            }

            this.rows = newRows;

            // console.log(this.rows);

            setTimeout(this.gameStep, 20);

            let fps = 30;
            let waitingTime = Math.floor(1000/fps);
            let elapsed = performance.now() - start;
            waitingTime = Math.max(0, waitingTime-elapsed)
            // console.log("elapsed: " + elapsed)
        },

        stopPlaying: function(){
            this.status = "paused";
            this.labBtnPlayPause = "Play";
        },

        clearClick: function(){
            this.stopPlaying();
            let height = this.rows.length;
            let width = this.rows[0].length;
            this.rows = new Array(height).fill(0).map(_ => new Array(width).fill(0).map(_ => new Cell("dead")));
        }
    },
})

function Cell(status) {

    if(status === 0)
        status = "dead";
    else if (status === 1)
        status = "alive";

    let _this = this;
    this.status = status;

    this.toggleStatus = function(){
        if (_this.status == "dead")
            _this.status = "alive";
        else
            _this.status = "dead";
    }
}