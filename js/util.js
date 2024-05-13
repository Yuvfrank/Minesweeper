'use strict'

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min)
}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function updateCellsCord(i, j, cellsToUpdate) {
    const idxToRemove = cellsToUpdate.findIndex(cell => cell.i === i && cell.j === j)
    cellsToUpdate.splice(idxToRemove, 1)
}

function getCurrentBackgroundColor(elCell) {
    return window.getComputedStyle(elCell).getPropertyValue('background-color')
}