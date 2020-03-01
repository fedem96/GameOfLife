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
    
    constructor(visibleWidth, visibleHeight){
        this.topLeftCornerX = 0;
        this.topLeftCornerY = 0;
        this.visibleHeight = visibleHeight;
        this.visibleWidth = visibleWidth;

        this._aliveCellsRC = new Set();
        this.visibleGrid = [];
        this.updateVisibleGrid();
        this.autoFit = false;
    }

    updateVisibleGrid(){
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
        this.updateVisibleGrid();
    }

    clear(){
        this._aliveCellsRC = new Set();
        this.updateVisibleGrid();
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
                neighbors.push(JSON.stringify([r, c]));
            }
        }

        return neighbors;
    }

    setContent(aliveCellsRC){
        this._aliveCellsRC = aliveCellsRC;
        this.updateVisibleGrid();
    }

    setTopCorner(x, y){
        this.topLeftCornerX = x;
        this.topLeftCornerY = y;
        this.updateVisibleGrid();
    }

    setDimension(maxR, maxC){
        this.visibleWidth = maxC;
        this.visibleHeight = maxR;
        this.updateVisibleGrid();
    }

    move(deltaX, deltaY){
        this.topLeftCornerX += deltaX;
        this.topLeftCornerY += deltaY;
        this.updateVisibleGrid();
    }

    changeDimension(deltaWidht, deltaHeight){
        this.visibleWidth += deltaWidht;
        this.visibleHeight += deltaHeight;
        this.updateVisibleGrid();
    }

}
