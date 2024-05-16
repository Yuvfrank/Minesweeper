'use strict'

function onSetDifficulty(lvl) {
    // Set model properties based on level and reset game
    gLevel = levelDict[lvl]
    onReset()
}

// // Option 2 passing (this)
// function onSetDifficulty({ innerText }) {
//     // Set model properties based on level and reset game
//     gLevel = levelDict[innerText.replace(/[\p{Emoji_Presentation}\s]/gu, '').toLowerCase()]
//     onReset()
// }

function updateResetButton() {
    // Update reset button on DOM based on current game status
    const elBtn = document.querySelector('.reset')

    if (gGame.isOn) {
        elBtn.innerText = 'Reset Game 🔄'
    }
    else {
        elBtn.innerText = ((gGame.isVictory) ? '🏆 Victory! ' : '😢 Defeat... ') + 'Play Again?'
    }
}

function updateLifeCountText() {
    // Update life on DOM based on Model status
    const elLife = document.querySelector('.life')
    elLife.innerText = `Remaining Life: ${gGame.lifeCount}`
}

function updateSpecialFeaturesText() {
    const elBtnHint = document.querySelector('.hint')
    const elBtnMega = document.querySelector('.mega')
    const elBtnSafe = document.querySelector('.safe')
    const elBtnExterminate = document.querySelector('.exterminate')
    elBtnHint.innerText = `Hints 💡X${gGame.hintCount}`
    elBtnMega.innerText = `Mega Hints 🧠X${gGame.megaHintCount}`
    elBtnSafe.innerText = `Safe Clicks 🧷X${gGame.safeClickCount}`
    elBtnExterminate.innerText = `Exterminate 💥X${gGame.exterminatorCount}`
    updateResetButton()
    updateUndoButton()
    updateLifeCountText()
    updateBestScore()
}

function startTimer() {
    // Start a clean timer interval, update Model & DOM
    var start = Date.now()
    const elTime = document.querySelector('.time')

    gTimer = setInterval(() => {
        gGame.secsPassed = ((Date.now() - start) / 1000).toFixed(3)
        elTime.innerText = gGame.secsPassed
    }, 29)
}

function onHint(elBtn) {
    if (!gGame.isOn || !gGame.hintCount || !gTimer) {
        return
    }

    gGame.isHint = !gGame.isHint
    elBtn.innerText = (gGame.isHint) ? '💡 Active' : `Hints 💡X${gGame.hintCount}`
}

function useHint(i, j) {
    onCellToggleHint(i, j)
    setTimeout(() => {
        onCellToggleHint(i, j)
    }, 1000)

    gGame.hintCount--
    gGame.isHint = false

    const elBtn = document.querySelector('.hint')
    elBtn.innerText = `Hints 💡X${gGame.hintCount}`
}

function onCellToggleHint(rowIdx, colIdx) {
    for (var i = rowIdx - 1; i <= rowIdx + 1; i++) {
        if (i < 0 || i >= gBoard.length) continue

        for (var j = colIdx - 1; j <= colIdx + 1; j++) {
            if (j < 0 || j >= gBoard[0].length) continue

            const currCell = gBoard[i][j]
            if (currCell.isShown) continue

            const elCell = document.querySelector(`.cell-${i}-${j}`)

            if (currCell.isMarked) elCell.classList.toggle('flag')

            if (currCell.isMine) {
                elCell.classList.toggle('mine')
            }

            else {
                elCell.classList.toggle('tagged')
            }
        }
    }
}

function onMegaHint(elBtn) {
    // Exit if no mega hints available
    if (!gGame.isOn || !gGame.megaHintCount || !gTimer) {
        return
    }

    gGame.isMegaHint = !gGame.isMegaHint
    elBtn.innerText = (gGame.isMegaHint) ? '🧠 Active' : `Mega Hints 🧠X${gGame.megaHintCount}`

}

function useMegaHint(megaCellsCord) {
    const [smallRowIdx, bigRowIdx] = megaCellsCord.map(cell => cell.i).sort((a, b) => a - b)
    const [smallColIdx, bigColIdx] = megaCellsCord.map(cell => cell.j).sort((a, b) => a - b)

    onCellToggleMegaHint(smallRowIdx, bigRowIdx, smallColIdx, bigColIdx)
    setTimeout(() => {
        onCellToggleMegaHint(smallRowIdx, bigRowIdx, smallColIdx, bigColIdx)
    }, 1000)

    megaCellsCord.splice(0, 2)
    gGame.megaHintCount--
    gGame.isMegaHint = false

    const elBtn = document.querySelector('.mega')
    elBtn.innerText = `Mega Hints 🧠X${gGame.megaHintCount}`
}

function onCellToggleMegaHint(smallRowIdx, bigRowIdx, smallColIdx, bigColIdx) {
    for (var i = smallRowIdx; i <= bigRowIdx; i++) {
        for (var j = smallColIdx; j <= bigColIdx; j++) {
            const currCell = gBoard[i][j]
            if (currCell.isShown) continue

            const elCell = document.querySelector(`.cell-${i}-${j}`)
            if (elCell.classList.contains('mega-tag')) elCell.classList.remove('mega-tag')

            if (currCell.isMarked) elCell.classList.toggle('flag')

            if (currCell.isMine) {
                elCell.classList.toggle('mine')
            }

            else {
                elCell.classList.toggle('tagged')
            }
        }
    }
}

function onSafeClick(elBtn) {
    // Exit if no safe clicks available
    if (!gGame.isOn || !gGame.safeClickCount || !gTimer) {
        return
    }

    saveGame()

    // If no safe cells available exit and alert user
    if (!hiddenEmptyCellsCord.length) {
        elBtn.innerText = '🔺 No Safe Cells 🔺'
        return
    }

    // Get a random safe cell and alert it to the user for 3s, consume a safe click
    const randomIdx = getRandomInt(0, hiddenEmptyCellsCord.length)
    const elCell = document.querySelector(`.cell-${hiddenEmptyCellsCord[randomIdx].i}-${hiddenEmptyCellsCord[randomIdx].j}`)
    const bgColor = getCurrentBackgroundColor(elCell)

    elCell.style.setProperty('--bg-color', bgColor)
    elCell.classList.add('safe-click')

    gGame.safeClickCount--
    elBtn.innerText = `Safe Clicks 🧷X${gGame.safeClickCount}`
}

function updateBestScore(time = Infinity, totalCells = undefined) {
    if (gGame.manualModeMines > 0 || gGame.isCheater) return
    const difficulties = [
        { cells: 16, key: 'beginnerBestScore', selector: '.lvl1', label: 'Beginner' },
        { cells: 64, key: 'advancedBestScore', selector: '.lvl2', label: 'Advanced' },
        { cells: 144, key: 'expertBestScore', selector: '.lvl3', label: 'Expert' }]

    difficulties.forEach(difficulty => {
        if (!totalCells || totalCells === difficulty.cells) {
            const elScore = document.querySelector(difficulty.selector)
            const bestScoreKey = difficulty.key
            const currBestScore = +localStorage[bestScoreKey]

            if (!currBestScore || time < currBestScore) {
                localStorage[bestScoreKey] = time
                elScore.innerText = `${difficulty.label}: ${time}s`
            }

            else {
                elScore.innerText = `${difficulty.label}: ${currBestScore}s`
            }
        }
    })
}

function onMineExterminator(elBtn, board) {
    // Exit if no exterminate available or there are 0 mines on board (before 1st click)
    if (!gGame.isOn || !gGame.exterminatorCount || !gTimer) {
        return
    }

    saveGame()

    // If no hidden mine cells available exit and alert user
    if (!hiddenUnmarkedMineCellsCord.length) {
        elBtn.innerText = 'Clear ✔️'
        return
    }

    // Get 3 or less random hidden unflagged mine cells and remove them from play, consume exterminate
    const minesToRemove = Math.min(3, hiddenUnmarkedMineCellsCord.length)
    for (var i = 0; i < minesToRemove; i++) {
        const randomIdx = getRandomInt(0, hiddenUnmarkedMineCellsCord.length)
        const randomCell = hiddenUnmarkedMineCellsCord.splice(randomIdx, 1)

        board[randomCell[0].i][randomCell[0].j].isMine = false
        gGame.minesRemovedCount++

        const elCell = document.querySelector(`.cell-${randomCell[0].i}-${randomCell[0].j}`)
        const bgColor = getCurrentBackgroundColor(elCell)

        elCell.style.setProperty('--bg-color', bgColor)
        elCell.classList.add('mine-removed')
    }

    setBoardMinesNegsCount(board)

    gGame.exterminatorCount--
    elBtn.innerText = `Exterminate 💥X${gGame.exterminatorCount}`
}

function saveGame() {
    // Save each move by making a deep copy of the current game state and pushing it to move history array
    const lastMove = {
        board: JSON.parse(JSON.stringify(gBoard)),
        game: { ...gGame },
        hiddenEmptyCells: [...hiddenEmptyCellsCord],
        hiddenMinesCells: [...hiddenUnmarkedMineCellsCord],
        megaHintCells: [...megaHintCellsCord],
        elGameOptions: document.querySelector('.options').innerHTML,
        elGameBoard: document.querySelector('.board').innerHTML
    }
    moveHistory.push(lastMove)
    updateUndoButton()
}

function onUndo() {
    if (!moveHistory.length || !gGame.isOn) {
        return
    }

    const lastMove = moveHistory.pop()
    const elOptions = document.querySelector('.options')
    const elBoard = document.querySelector('.board')

    gBoard = JSON.parse(JSON.stringify(lastMove.board))
    gGame = { ...lastMove.game }
    gGame.isCheater = true
    hiddenEmptyCellsCord = [...lastMove.hiddenEmptyCells]
    hiddenUnmarkedMineCellsCord = [...lastMove.hiddenMinesCells]
    megaHintCellsCord = [...lastMove.megaHintCells]

    elOptions.innerHTML = lastMove.elGameOptions
    elBoard.innerHTML = lastMove.elGameBoard
    updateUndoButton()
}

function updateUndoButton() {
    const elBtn = document.querySelector('.undo')
    if (!gGame.shownCount || !gGame.isOn) elBtn.innerText = 'No Undo ❌'
    else elBtn.innerText = 'Undo ⏪'
}

function onManualMode(elBtn) {
    if (!gGame.isManual) onReset()
    gGame.isManual = !gGame.isManual
    if (!gGame.isManual) {
        setBoardMinesNegsCount(gBoard)
        hiddenUnmarkedMineCellsCord.forEach(cell => {
            const elCell = document.querySelector(`.cell-${cell.i}-${cell.j}`)
            elCell.classList.remove('mine')
        })
        if (!gTimer && gGame.manualModeMines) {
            startTimer()
            // playStartSound()
        }
    }
    elBtn.innerText = (gGame.isManual) ? 'Start Game? ✔️' : 'Manual Mode 🚧'
}

function onMode(elBtn) {
    const elStyle = document.getElementById("stylesheet")
    gGame.modeCounter = (gGame.modeCounter + 1) % 3

    switch (gGame.modeCounter) {
        case 0:
            elBtn.innerText = 'Dark Mode 🌓'
            elStyle.href = 'css/style.css'
            break
        case 1:
            elBtn.innerText = 'Theme Mode 🦈'
            elStyle.href = 'css/style2.css'
            break
        case 2:
            elBtn.innerText = 'Light Mode 🌗'
            elStyle.href = 'css/style3.css'
            break
    }
}

function playStartSound() {
    const audio = new Audio('audio/start.mp3')
    audio.volume = 0.1
    audio.play()
}