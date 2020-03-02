class Cell { // single cell in the board
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

    toggleStatus() {
        // change cell status
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


class Board{ // infinite Game of Life board

    constructor(visibleWidth, visibleHeight){
        this.topLeftCornerX = 0;
        this.topLeftCornerY = 0;
        this.visibleHeight = visibleHeight;
        this.visibleWidth = visibleWidth;

        this.aliveCellsRC = new Set(); // track alive cells only
        this.visibleGrid = [];         // visible grid (obtained from aliveCellsRC, used by vue.js to generate HTML)
        this.updateVisibleGrid();
    }

    updateVisibleGrid(){
        // update visible grid from content of aliveCellsRC
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
        for (let pair of this.aliveCellsRC) {
            pair = JSON.parse(pair);
            let cy = pair[0] - ty;
            let cx = pair[1] - tx;
            if (cx < 0 || cx >= vw || cy < 0 || cy >= vh) continue;
            newVisibleGrid[cy][cx].toggleStatus();
        }
        this.visibleGrid = newVisibleGrid;
    }

    update(cell){
        // get cell status changed notification
        let jsonPosition = JSON.stringify([cell.row, cell.column]);
        if(cell.status == "alive"){
            if(!(this.aliveCellsRC.has(jsonPosition)))
                this.aliveCellsRC.add(jsonPosition);
        } else {
            if(this.aliveCellsRC.has(jsonPosition))
                this.aliveCellsRC.delete(jsonPosition);
        }
    }

    step(){
        // do Game of Life step

        // calculate number of neighbors
        let numNeighbors = {};
        for (const pair of this.aliveCellsRC) {
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
            if(num == 3 || (num == 2 && this.aliveCellsRC.has(pair)))
                newAliveCellsRC.add(pair);
        }
        this.aliveCellsRC = newAliveCellsRC;

        // update visible grid
        this.updateVisibleGrid();
    }

    clear(){
        // kill all alive cells
        this.aliveCellsRC = new Set();
        this.updateVisibleGrid();
    }

    _getNeighbors(cellPosition){
        // get cell neighbors
        cellPosition = JSON.parse(cellPosition);
        let neighbors = [];

        for (let i = -1; i <= 1; i++){
            for (let j = -1; j <= 1; j++){
                if(i == 0 && i == j)
                    continue;
                let r = cellPosition[0]+i;
                let c = cellPosition[1]+j;
                neighbors.push(JSON.stringify([r, c]));
            }
        }

        return neighbors;
    }

    setContent(aliveCellsRC){
        this.aliveCellsRC = aliveCellsRC;
        this.updateVisibleGrid();
    }

    setTopCorner(x, y){
        this.topLeftCornerX = x;
        this.topLeftCornerY = y;
        this.updateVisibleGrid();
    }

    setDimension(vWidth, vHeight){
        this.visibleWidth = vWidth;
        this.visibleHeight = vHeight;
        this.updateVisibleGrid();
    }

    move(deltaX, deltaY){
        this.topLeftCornerX += deltaX;
        this.topLeftCornerY += deltaY;
        this.updateVisibleGrid();
    }

    changeDimension(deltaWidth, deltaHeight){
        this.visibleWidth += deltaWidth;
        this.visibleHeight += deltaHeight;
        this.updateVisibleGrid();
    }

}
