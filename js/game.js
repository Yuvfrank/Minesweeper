'use strict'

// Global variables

var gBoard
var gTimer
var gGame
var gLevel
var hiddenEmptyCellsCord = []
var hiddenUnmarkedMineCellsCord = []
var megaHintCellsCord = []
var moveHistory = []

const levelDict = {
    beginner: { SIZE: 4, MINES: 2, LIFE: 2 },
    advanced: { SIZE: 8, MINES: 14, LIFE: 3 },
    expert: { SIZE: 12, MINES: 32, LIFE: 4 }
}

// Default game settings
const defaultSettings = {
    isOn: true,
    isVictory: false,
    isHint: false,
    isMegaHint: false,
    isManual: false,
    isCheater: false,
    shownCount: 0,
    markedCount: 0,
    lifeCount: 2,
    hintCount: 3,
    megaHintCount: 1,
    safeClickCount: 3,
    exterminatorCount: 1,
    minesRemovedCount: 0,
    manualModeMines: 0,
    modeCounter: 0,
    secsPassed: 0
}

function onInit() {
    // Set default setting, difficulty (beginner by default), make board etc.
    gGame = { ...defaultSettings }
    gLevel = gLevel || levelDict.beginner
    gGame.lifeCount = gLevel.LIFE
    gBoard = buildBoard()
    renderBoard(gBoard)
    updateSpecialFeaturesText()
}

function buildBoard() {
    // Build basic board model for the game
    const size = gLevel.SIZE
    const board = []

    for (var i = 0; i < size; i++) {
        board.push([])

        for (var j = 0; j < size; j++) {
            board[i][j] = {
                minesAroundCount: 0,
                isShown: false,
                isMine: false,
                isMarked: false
            }
            hiddenEmptyCellsCord.push({ i, j })
        }
    }

    return board
}

function renderBoard(board) {
    // Render the board model
    const elBoard = document.querySelector('.board')
    var strHTML = ''

    for (var i = 0; i < board.length; i++) {
        strHTML += '<tr>\n'
        for (var j = 0; j < board[0].length; j++) {

            const className = `cell cell-${i}-${j}`

            strHTML += `\t<td 
            class="${className}"
            onclick="onCellClicked(this, ${i}, ${j})"
            oncontextmenu="onCellMarked(this, ${i}, ${j})">
            </td>\n`
        }
        strHTML += '</tr>\n'
    }

    elBoard.innerHTML = strHTML
}

function onCellClicked(elCell, i, j) {
    const currCell = gBoard[i][j]

    // Exit if game isn't on or cell is already shown
    if (!gGame.isOn || currCell.isShown) {
        return
    }

    // If using a hint execute the following
    if (gGame.isHint) {
        saveGame()
        useHint(i, j)
        return
    }

    // If using a hint execute the following
    if (gGame.isMegaHint) {
        saveGame()
        megaHintCellsCord.push({ i, j })
        elCell.classList.add('mega-tag')

        if (megaHintCellsCord.length === 2) {
            useMegaHint(megaHintCellsCord)
        }
        return
    }

    // If on manual mode
    if (gGame.isManual) {
        if (currCell.isMine) return
        saveGame()
        currCell.isMine = true
        gGame.manualModeMines++
        hiddenUnmarkedMineCellsCord.push({ i, j })
        updateCellsCord(i, j, hiddenEmptyCellsCord)
        elCell.classList.add('mine')
        return
    }

    // Exit if cell is already marked (wanted to allow hint on marked cells)
    if (currCell.isMarked) {
        return
    }

    saveGame()

    // Update shared model properties
    currCell.isShown = true
    gGame.shownCount++

    // Update Model & DOM if cell contains a mine
    if (currCell.isMine) {
        gGame.lifeCount--
        updateCellsCord(i, j, hiddenUnmarkedMineCellsCord)
        updateLifeCountText()
        elCell.classList.add('mine')
    }

    // Update Model & DOM if cell is empty
    else {
        updateCellsCord(i, j, hiddenEmptyCellsCord)

        // On first click set mines randomley on board and update Model
        if (gGame.shownCount === 1 && !gGame.manualModeMines) {
            onFirstClick(gBoard)
        }

        // Only show number text in case there are mines nearby, to keep a clean board
        elCell.classList.add('tagged')

        // If the clicked cell is empty, reveal nearby non-mine cells
        if (!currCell.minesAroundCount) {
            expandShown(gBoard, i, j)
        }
    }

    // Check for game over conditions after each click is made
    checkGameOver()
}

function onFirstClick(board) {
    // Draw 1 random empty cell and put a mine in it, repeat based on number of mines in current level
    for (var i = 0; i < gLevel.MINES; i++) {
        const randomIdx = getRandomInt(0, hiddenEmptyCellsCord.length)
        const randomCell = hiddenEmptyCellsCord.splice(randomIdx, 1)
        hiddenUnmarkedMineCellsCord.push(randomCell[0])
        board[randomCell[0].i][randomCell[0].j].isMine = true
    }

    setBoardMinesNegsCount(board)
    updateUndoButton()
    if (!gTimer) startTimer()
    // playStartSound()
}

function setBoardMinesNegsCount(board) {
    // Itterate over entire matrix, count mines around each cell and update model
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
            setCellMinesNegsCount(board, i, j)
        }
    }
}

function setCellMinesNegsCount(board, rowIdx, colIdx) {
    const currCell = board[rowIdx][colIdx]
    const elCell = document.querySelector(`.cell-${rowIdx}-${colIdx}`)
    var minesAroundCount = 0

    // Itterate over all cells surrounding our current cell, count mines and update our model
    for (var i = rowIdx - 1; i <= rowIdx + 1; i++) {
        if (i < 0 || i >= board.length) continue

        for (var j = colIdx - 1; j <= colIdx + 1; j++) {
            if (j < 0 || j >= board[0].length) continue
            if (i === rowIdx && j === colIdx) continue
            if (board[i][j].isMine) {
                minesAroundCount++
            }
        }
    }
    currCell.minesAroundCount = minesAroundCount

    if (currCell.minesAroundCount > 0) {
        elCell.innerText = currCell.minesAroundCount
    }
    else {
        elCell.innerText = ''
    }
}

function onCellMarked(elCell, i, j) {
    // Exit if game isn't on or trying to flag a shown cell
    const currCell = gBoard[i][j]
    if (!gGame.isOn || currCell.isShown) {
        return
    }

    saveGame()

    // Update Model accounting flagging & de-flagging
    if (currCell.isMarked) {
        currCell.isMarked = false
        gGame.markedCount--
        if (currCell.isMarked) hiddenUnmarkedMineCellsCord.push({ i, j })
    }

    else if (!currCell.isMarked) {
        // cannot use more flags than mines in play (we lose a life and a flag for each mine we click on)
        const initialMines = (!gGame.manualModeMines) ? gLevel.MINES : gGame.manualModeMines
        if (gGame.markedCount + gLevel.LIFE >= initialMines + gGame.lifeCount) {
            return
        }
        currCell.isMarked = true
        gGame.markedCount++
        if (currCell.isMine) updateCellsCord(i, j, hiddenUnmarkedMineCellsCord)
    }

    // Update DOM accounting flagging & de-flagging
    elCell.classList.toggle('flag')
    checkGameOver()
}

function checkGameOver() {
    const gameOver = checkDefeat() || checkVictory()

    // Update game status, stop the clock & update reset button
    if (gameOver) {
        gGame.isOn = false
        clearInterval(gTimer)
        updateResetButton()
        updateUndoButton()
    }
}

function checkDefeat() {
    // Lose condition (out of life)
    const remainingLife = gGame.lifeCount
    if (!remainingLife) {
        clearFlags(gBoard)
        showMines(gBoard)
        return true
    }
    return false
}

function checkVictory() {
    // Win condition (all mines are flagged and all the other cells are shown)
    if (hiddenEmptyCellsCord.length > 0) {
        return false
    }

    const totalCells = gLevel.SIZE ** 2
    const totalShown = gGame.shownCount
    const totalMarked = gGame.markedCount
    const minesRemoved = gGame.minesRemovedCount
    const minesShown = gLevel.LIFE - gGame.lifeCount // User lose a life when a mine is clicked
    const initialMines = (!gGame.manualModeMines) ? gLevel.MINES : gGame.manualModeMines
    const totalCellsToShow = totalCells - initialMines + minesShown + minesRemoved

    const isMarkedAll = initialMines === totalMarked + minesShown + minesRemoved
    const isShownAll = totalShown === totalCellsToShow

    if (isMarkedAll && isShownAll) {
        gGame.isVictory = true
        updateBestScore(gGame.secsPassed, totalCells)
        return true
    }
    return false
}

function showMines(board) {
    // Itterate over all cells on board and show the rest of the mines when the user lose, since game is over, we'll update only the DOM here
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
            const currCell = board[i][j]
            if (currCell.isMine && !currCell.isShown) {
                const elCell = document.querySelector(`.cell-${i}-${j}`)
                elCell.classList.add('mine')
            }
        }
    }
}

function clearFlags(board) {
    // Itterate over all cells on board and clear flags when the user lose, since game is over, we'll update only the DOM here
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
            const currCell = board[i][j]
            if (currCell.isMarked) {
                const elCell = document.querySelector(`.cell-${i}-${j}`)
                elCell.classList.remove('flag')
            }
        }
    }
}

function expandShown(board, rowIdx, colIdx) {

    // Check surrounding cells, if they're not shown, show them (recursion)
    // recursion exit condition
    if (board[rowIdx][colIdx].minesAroundCount > 0) {
        return
    } // Not really needed, just to represent recursion principle

    for (var i = rowIdx - 1; i <= rowIdx + 1; i++) {
        if (i < 0 || i >= board.length) continue

        for (var j = colIdx - 1; j <= colIdx + 1; j++) {
            if (j < 0 || j >= board[0].length ||
                i === rowIdx && j === colIdx) continue

            const currCell = board[i][j]
            const idxToRemove = hiddenEmptyCellsCord.findIndex(cell => cell.i === i && cell.j === j)
            if (currCell.isShown) continue

            if (currCell.isMarked) {
                currCell.isMarked = false
                gGame.markedCount--
                const elCell = document.querySelector(`.cell-${i}-${j}`)
                elCell.classList.remove('flag')
            }

            currCell.isShown = true
            gGame.shownCount++
            hiddenEmptyCellsCord.splice(idxToRemove, 1)

            const elCell = document.querySelector(`.cell-${i}-${j}`)
            elCell.classList.add('tagged')

            if (!currCell.minesAroundCount) {
                expandShown(board, i, j)
            }
        }
    }
}

function onReset() {
    // Clear clock interval & reset clock back to 0.000
    clearInterval(gTimer)
    gTimer = undefined

    // Reset game settings to default
    hiddenEmptyCellsCord = []
    hiddenUnmarkedMineCellsCord = []
    moveHistory = []
    onInit()
    const elTime = document.querySelector('.time')
    elTime.innerText = '0.000'
}