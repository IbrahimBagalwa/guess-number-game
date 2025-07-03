import React, { useState, useEffect, useRef, useCallback } from 'react'

interface HintData {
  twoCorrect: number[]
  oneCorrectAndWellPlaced: number[]
  oneCorrectButWrongPlaced1: number[]
  oneCorrectButWrongPlaced2: number[]
  nothingIsCorrect: number[]
}

type HintType = 'hint1' | 'hint2' | 'hint3' | 'hint4'

interface HintComponentProps {
  numbers: number[]
  color: string
  text: string
}

const GAME_CONFIG = {
  CODE_LENGTH: 3,
  MIN_DIGIT: 0,
  MAX_DIGIT: 9,
  MIN_FILL_EMPTY: 1,
  MAX_FILL_EMPTY: 5,
} as const

const MESSAGES = {
  INITIAL_HEADER: 'CAN YOU GUESS THE NUMBER?',
  SUCCESS_HEADER: 'GOOD JOB!',
  REVEAL_ANSWER: 'Reveal Answer',
} as const

const ANIMATION_CLASSES = {
  LOCK_UNLOCKED: 'lock-unlocked',
  BOUNCE_IN: 'bounce-in',
} as const

class PuzzleGenerator {
  private static getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  private static getRandomArrayElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)]
  }

  private static findNumberNotInArrays(
    array1: number[],
    array2: number[] = [],
    array3: number[] = []
  ): number {
    const maxAttempts = 100
    let attempts = 0

    while (attempts < maxAttempts) {
      const randomInt = this.getRandomInt(
        GAME_CONFIG.MIN_DIGIT,
        GAME_CONFIG.MAX_DIGIT
      )
      if (
        !array1.includes(randomInt) &&
        !array2.includes(randomInt) &&
        !array3.includes(randomInt)
      ) {
        return randomInt
      }
      attempts++
    }
    console.warn('Could not find unique number, using fallback')
    return this.getRandomInt(GAME_CONFIG.MIN_DIGIT, GAME_CONFIG.MAX_DIGIT)
  }

  private static findIndexNotEqual(
    excludeIndex1: number,
    excludeIndex2: number = -1
  ): number {
    const maxAttempts = 10
    let attempts = 0

    while (attempts < maxAttempts) {
      const randomIndex = Math.floor(Math.random() * GAME_CONFIG.CODE_LENGTH)
      if (excludeIndex1 !== randomIndex && excludeIndex2 !== randomIndex) {
        return randomIndex
      }
      attempts++
    }
    return excludeIndex1 === 0 ? 1 : 0
  }

  private static findCorrectNumberNotEqual(
    excludeNumber1: number,
    excludeNumber2: number,
    correctCode: number[]
  ): number {
    const maxAttempts = 10
    let attempts = 0

    while (attempts < maxAttempts) {
      const randomNumber = this.getRandomArrayElement(correctCode)
      if (excludeNumber1 !== randomNumber && excludeNumber2 !== randomNumber) {
        return randomNumber
      }
      attempts++
    }
    return (
      correctCode.find(
        (num) => num !== excludeNumber1 && num !== excludeNumber2
      ) || correctCode[0]
    )
  }

  private static findWrongNumberNotInArray(
    excludeArray: number[],
    nothingIsCorrect: number[]
  ): number {
    const maxAttempts = 10
    let attempts = 0

    while (attempts < maxAttempts) {
      const randomNumber = this.getRandomArrayElement(nothingIsCorrect)
      if (!excludeArray.includes(randomNumber)) {
        return randomNumber
      }
      attempts++
    }
    return nothingIsCorrect[0]
  }

  static generateCorrectCode(): number[] {
    const code: number[] = []
    code[0] = this.findNumberNotInArrays([])
    code[1] = this.findNumberNotInArrays(code)
    code[2] = this.findNumberNotInArrays(code)
    return code
  }

  static generateHints(correctCode: number[]): HintData {
    const hints: HintData = {
      twoCorrect: [-1, -1, -1],
      oneCorrectAndWellPlaced: [-1, -1, -1],
      oneCorrectButWrongPlaced1: [-1, -1, -1],
      oneCorrectButWrongPlaced2: [-1, -1, -1],
      nothingIsCorrect: [-1, -1, -1],
    }
    hints.nothingIsCorrect[0] = this.findNumberNotInArrays(correctCode)
    hints.nothingIsCorrect[1] = this.findNumberNotInArrays(
      correctCode,
      hints.nothingIsCorrect
    )
    hints.nothingIsCorrect[2] = this.findNumberNotInArrays(
      correctCode,
      hints.nothingIsCorrect
    )
    const number1 = this.findCorrectNumberNotEqual(-1, -1, correctCode)
    const number2 = this.findCorrectNumberNotEqual(number1, -1, correctCode)
    const index1 = this.findIndexNotEqual(correctCode.indexOf(number1))
    const index2 = this.findIndexNotEqual(correctCode.indexOf(number2), index1)
    hints.twoCorrect[index1] = number1
    hints.twoCorrect[index2] = number2

    const hint2number = this.findCorrectNumberNotEqual(-1, -1, correctCode)
    const hint3number = this.findCorrectNumberNotEqual(
      hint2number,
      -1,
      correctCode
    )
    const hint4number = this.findCorrectNumberNotEqual(
      hint2number,
      hint3number,
      correctCode
    )

    hints.oneCorrectAndWellPlaced[correctCode.indexOf(hint2number)] =
      hint2number

    const hint3WrongIndex = hints.twoCorrect.includes(hint3number)
      ? this.findIndexNotEqual(
          correctCode.indexOf(hint3number),
          hints.twoCorrect.indexOf(hint3number)
        )
      : this.findIndexNotEqual(correctCode.indexOf(hint3number))
    hints.oneCorrectButWrongPlaced1[hint3WrongIndex] = hint3number

    const hint4WrongIndex = hints.twoCorrect.includes(hint4number)
      ? this.findIndexNotEqual(
          correctCode.indexOf(hint4number),
          hints.twoCorrect.indexOf(hint4number)
        )
      : this.findIndexNotEqual(correctCode.indexOf(hint4number))
    hints.oneCorrectButWrongPlaced2[hint4WrongIndex] = hint4number

    this.fillEmptyPositions(hints, correctCode)

    return hints
  }

  private static fillEmptyPositions(
    hints: HintData,
    correctCode: number[]
  ): void {
    const emptyPositions: Array<[HintType, number]> = []

    Object.entries(hints).forEach(([hintKey, hintArray]) => {
      if (hintKey === 'nothingIsCorrect') return

      hintArray.forEach((item, index) => {
        if (item === -1) {
          const hintType = this.getHintTypeFromKey(hintKey)
          if (hintType) {
            emptyPositions.push([hintType, index])
          }
        }
      })
    })

    const fillCount = Math.min(
      this.getRandomInt(GAME_CONFIG.MIN_FILL_EMPTY, GAME_CONFIG.MAX_FILL_EMPTY),
      emptyPositions.length
    )

    for (let i = 0; i < fillCount; i++) {
      const randomIndex = Math.floor(Math.random() * emptyPositions.length)
      const [hintType, position] = emptyPositions[randomIndex]
      emptyPositions.splice(randomIndex, 1)

      const targetArray = this.getHintArray(hints, hintType)
      if (targetArray) {
        targetArray[position] = this.findWrongNumberNotInArray(
          targetArray,
          hints.nothingIsCorrect
        )
      }
    }

    emptyPositions.forEach(([hintType, position]) => {
      const targetArray = this.getHintArray(hints, hintType)
      if (targetArray) {
        targetArray[position] = this.findNumberNotInArrays(
          correctCode,
          hints.nothingIsCorrect,
          targetArray
        )
      }
    })
  }

  private static getHintTypeFromKey(key: string): HintType | null {
    const keyMap: Record<string, HintType> = {
      twoCorrect: 'hint1',
      oneCorrectAndWellPlaced: 'hint2',
      oneCorrectButWrongPlaced1: 'hint3',
      oneCorrectButWrongPlaced2: 'hint4',
    }
    return keyMap[key] || null
  }

  private static getHintArray(
    hints: HintData,
    hintType: HintType
  ): number[] | null {
    const hintMap: Record<HintType, number[]> = {
      hint1: hints.twoCorrect,
      hint2: hints.oneCorrectAndWellPlaced,
      hint3: hints.oneCorrectButWrongPlaced1,
      hint4: hints.oneCorrectButWrongPlaced2,
    }
    return hintMap[hintType] || null
  }
}

const LockGame = () => {
  const [correctCode, setCorrectCode] = useState<number[]>([0, 0, 0])
  const [inputs, setInputs] = useState<string[]>(['', '', ''])
  const [disabled, setDisabled] = useState<boolean>(false)
  const [header, setHeader] = useState<string>(MESSAGES.INITIAL_HEADER)
  const [continueVisible, setContinueVisible] = useState<boolean>(false)
  const [answer, setAnswer] = useState<string>(MESSAGES.REVEAL_ANSWER)
  const [hints, setHints] = useState<HintData>({
    twoCorrect: [],
    oneCorrectAndWellPlaced: [],
    oneCorrectButWrongPlaced1: [],
    oneCorrectButWrongPlaced2: [],
    nothingIsCorrect: [],
  })

  const lockRef = useRef<HTMLDivElement>(null)
  const continueButtonRef = useRef<HTMLButtonElement>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, GAME_CONFIG.CODE_LENGTH)
  }, [])

  const generateNew = useCallback((): void => {
    const newCorrectCode = PuzzleGenerator.generateCorrectCode()
    const newHints = PuzzleGenerator.generateHints(newCorrectCode)

    setCorrectCode(newCorrectCode)
    setInputs(new Array(GAME_CONFIG.CODE_LENGTH).fill(''))
    setDisabled(false)
    setContinueVisible(false)
    setHeader(MESSAGES.INITIAL_HEADER)
    setAnswer(MESSAGES.REVEAL_ANSWER)
    setHints(newHints)

    if (lockRef.current) {
      lockRef.current.classList.remove(ANIMATION_CLASSES.LOCK_UNLOCKED)
    }
  }, [])

  const checkWinCondition = useCallback(
    (newInputs: string[]): boolean => {
      return newInputs.every(
        (input, index) =>
          input !== '' && parseInt(input, 10) === correctCode[index]
      )
    },
    [correctCode]
  )

  const animateWithReflow = useCallback(
    (ref: React.RefObject<HTMLElement>, animationClass: string): void => {
      if (ref.current) {
        ref.current.classList.remove(animationClass)
        void ref.current.offsetWidth
        ref.current.classList.add(animationClass)
      }
    },
    []
  )

  const handleWin = useCallback((): void => {
    setDisabled(true)
    setContinueVisible(true)
    setHeader(MESSAGES.SUCCESS_HEADER)

    if (lockRef.current) {
      lockRef.current.classList.add(ANIMATION_CLASSES.LOCK_UNLOCKED)
    }

    animateWithReflow(continueButtonRef, ANIMATION_CLASSES.BOUNCE_IN)
  }, [animateWithReflow])

  const handleCodeInput = useCallback(
    (index: number, value: string): void => {
      const processedValue =
        value.length >= 2 ? value.charAt(value.length - 1) : value

      const newInputs = [...inputs]
      newInputs[index] = processedValue
      setInputs(newInputs)

      if (processedValue && index < GAME_CONFIG.CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus()
      }

      if (checkWinCondition(newInputs)) {
        handleWin()
      }
    },
    [inputs, checkWinCondition, handleWin]
  )

  const revealAnswer = useCallback((): void => {
    setAnswer(correctCode.join(''))
  }, [correctCode])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (['e', 'E', '+', '-', '.'].includes(e.key)) {
        e.preventDefault()
      }
    },
    []
  )

  useEffect(() => {
    generateNew()
  }, [generateNew])

  return (
    <div className='flex flex-col items-center justify-between min-h-screen w-full bg-[#262626] text-white font-sofia'>
      <div className='intro-overlay'>
        <h1 className='text-[48px]'>GUESS THE NUMBER</h1>
        <span>By Ibrahim Bagalwa</span>
      </div>

      <div className='w-full text-center bg-[#1b1b1b] py-5 text-[32px]'>
        {header}
      </div>

      <div ref={lockRef} className='lock-animation relative mt-6'>
        <div className='lock-base absolute bottom-0 flex justify-center items-end'>
          {inputs.map((val, i) => (
            <input
              key={i}
              type='number'
              value={val}
              disabled={disabled}
              ref={(el) => {
                inputRefs.current[i] = el
              }}
              placeholder='0'
              className='bg-[#472d04] w-[45px] h-[45px] text-[40px] text-center rounded-[5px] mx-[5px] shadow-[0_5px_#00000057] placeholder-white/20'
              onChange={(e) => handleCodeInput(i, e.target.value)}
              onKeyDown={handleKeyDown}
              min={GAME_CONFIG.MIN_DIGIT}
              max={GAME_CONFIG.MAX_DIGIT}
              aria-label={`Code digit ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className='hint-wrapper flex flex-wrap justify-around w-[500px] max-w-full text-center mt-4'>
        <Hint
          numbers={hints.twoCorrect}
          color='text-[#4CAF50]'
          text='2 CORRECT BUT<br />WRONG PLACED'
        />
        <Hint
          numbers={hints.oneCorrectAndWellPlaced}
          color='text-[#CCDB39]'
          text='1 CORRECT AND<br />WELL PLACED'
        />
        <Hint
          numbers={hints.oneCorrectButWrongPlaced1}
          color='text-[#FEC007]'
          text='1 CORRECT BUT<br />WRONG PLACED'
        />
        <Hint
          numbers={hints.oneCorrectButWrongPlaced2}
          color='text-[#FEC007]'
          text='1 CORRECT BUT<br />WRONG PLACED'
        />
        <Hint
          numbers={hints.nothingIsCorrect}
          color='text-[#F44336]'
          text='NOTHING IS<br />CORRECT'
        />
      </div>

      <button
        ref={continueButtonRef}
        onClick={generateNew}
        disabled={!continueVisible}
        className={`continue-button mt-6 ${
          continueVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-label='Generate new puzzle'
      >
        Continue
      </button>

      <footer
        className='footer cursor-pointer mt-5'
        onClick={revealAnswer}
        role='button'
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            revealAnswer()
          }
        }}
        aria-label='Reveal answer'
      >
        {answer}
      </footer>
    </div>
  )
}

const Hint: React.FC<HintComponentProps> = React.memo(
  ({ numbers, color, text }) => (
    <div className='hint flex flex-col items-center my-[15px] mx-[22px]'>
      <div className='hint-top text-[24px] bg-[#1b1b1b] rounded-[5px] py-[5px] px-[10px] mb-[5px]'>
        {numbers.join(' ')}
      </div>
      <span
        className={`hint-text text-[11px] ${color}`}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    </div>
  )
)

Hint.displayName = 'Hint'

export default LockGame
