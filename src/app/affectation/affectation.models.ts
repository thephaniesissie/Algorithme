export interface MatrixStep {
  stepNum: number;
  title: string;
  description: string;
  matrix: number[][];
  rowMins?: number[];
  colMins?: number[];
  rowZeroCounts?: number[];
  colZeroCounts?: number[];
  marked?: { r: number; c: number; type: 'framed' | 'crossed' }[];
  coveredRows?: boolean[];
  coveredCols?: boolean[];
  minUncovered?: number;
  pivot?: { r: number; c: number };
  activeCell?: { r: number; c: number };
  lowerBound?: number;
  isFinal: boolean;
}

export interface Assignment {
  worker: string;
  job: string;
  cost: number;
  row: number;
  col: number;
}