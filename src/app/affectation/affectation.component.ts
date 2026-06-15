import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatrixStep, Assignment } from './affectation.models';
import PptxGenJS from 'pptxgenjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';


@Component({
  selector: 'app-affectation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './affectation.component.html',
  styleUrls: ['./affectation.component.css']
})
export class AffectationComponent {
  size = 6;
  labels: string[] = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  // Utiliser ngModel pour éviter les problèmes de focus
  matrixData: number[][] = [];
  originalMatrix: number[][] = [];
  workMatrix: number[][] = [];
  steps: MatrixStep[] = [];
  currentStep = -1;
  assignments: Assignment[] = [];
  totalCost = 0;
  lowerBound = 0;
  isRunning = false;
  errorMessage = '';
  result: { assignments: Assignment[], totalCost: number, isOptimal: boolean } | null = null;
  isMinimization = true;

  constructor() {
    this.initMatrix();
  }

  initMatrix() {
    // Initialiser avec des matrices vides
    this.matrixData = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
    this.originalMatrix = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
    this.reset();
  }

  resizeMatrix() {
    if (this.size < 2) this.size = 2;
    if (this.size > 10) this.size = 10;
    this.labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, this.size);
    
    const newMatrixData = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
    const newOriginalMatrix = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
    
    for (let i = 0; i < Math.min(this.size, this.matrixData.length); i++) {
      for (let j = 0; j < Math.min(this.size, this.matrixData[0]?.length || 0); j++) {
        newMatrixData[i][j] = this.matrixData[i][j] || 0;
        newOriginalMatrix[i][j] = this.originalMatrix[i][j] || 0;
      }
    }
    
    this.matrixData = newMatrixData;
    this.originalMatrix = newOriginalMatrix;
    this.reset();
  }

  reset() {
    // Copier les données actuelles
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        this.originalMatrix[i][j] = this.matrixData[i][j];
      }
    }
    this.workMatrix = this.originalMatrix.map(r => [...r]);
    this.steps = [];
    this.currentStep = -1;
    this.assignments = [];
    this.totalCost = 0;
    this.lowerBound = 0;
    this.errorMessage = '';
    this.result = null;
    this.isRunning = false;
  }

  // Correction: utiliser ngModel avec trackBy pour éviter les problèmes de focus
  onCellChange(row: number, col: number, event: any) {
    const value = event.target.value;
    const num = value === '' || value === '-' ? 0 : parseFloat(value);
    if (!isNaN(num)) {
      this.matrixData[row][col] = num;
      this.originalMatrix[row][col] = num;
    }
  }

  // Fonction trackBy pour optimiser le rendu
  trackByRow(index: number, item: any) {
    return index;
  }

  trackByCol(index: number, item: any) {
    return index;
  }

  fillRandom() {
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        this.matrixData[i][j] = Math.floor(Math.random() * 50) + 1;
        this.originalMatrix[i][j] = this.matrixData[i][j];
      }
    }
    this.reset();
  }

  loadExample() {
    this.size = 6;
    this.labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    this.matrixData = [
      [14, 6, 18, 16, 63, 15],
      [41, 78, 44, 73, 70, 25],
      [44, 81, 36, 80, 80, 78],
      [46, 74, 5, 25, 83, 3],
      [72, 32, 55, 51, 3, 81],
      [69, 76, 12, 99, 83, 80]
    ];
    this.originalMatrix = this.matrixData.map(r => [...r]);
    this.isMinimization = true;
    this.reset();
  }

  validateMatrix(): boolean {
    if (!this.isMinimization) return true;
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (this.originalMatrix[i][j] < 0) {
          this.errorMessage = 'Veuillez entrer des nombres positifs pour les coûts';
          return false;
        }
      }
    }
    return true;
  }

  runAlgorithm() {
    this.errorMessage = '';
    if (!this.validateMatrix()) return;

    this.isRunning = true;
    this.result = null;
    
    // Exécution synchrone (immédiate)
    try {
      this.executeHungarianAlgorithm();
    } catch (error) {
      this.errorMessage = 'Erreur lors du calcul : ' + error;
    } finally {
      this.isRunning = false;
    }
  }

  executeHungarianAlgorithm() {
    // Sauvegarder la matrice originale
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        this.originalMatrix[i][j] = this.matrixData[i][j];
      }
    }
    
    this.reset();
    
    let matrix = this.originalMatrix.map(r => [...r]);
    if (!this.isMinimization) {
      const maxVal = Math.max(...matrix.flat());
      matrix = matrix.map(r => r.map(v => maxVal - v));
    }

    this.workMatrix = matrix.map(r => [...r]);
    this.steps = [];
    this.lowerBound = 0;
    let stepNum = 1;

    // --- Étape 1a : Réduction par lignes ---
    const rowMins: number[] = [];
    for (let i = 0; i < this.size; i++) {
      const min = Math.min(...this.workMatrix[i]);
      rowMins.push(min);
      this.lowerBound += min;
      for (let j = 0; j < this.size; j++) {
        this.workMatrix[i][j] -= min;
      }
    }
    this.addStep(stepNum++, 'Étape 1a - Réduction par lignes', 
      `Soustraction du minimum de chaque ligne. Minima : [${rowMins.join(', ')}]`,
      { rowMins: [...rowMins], lowerBound: this.lowerBound });

    // --- Étape 1b : Réduction par colonnes ---
    const colMins: number[] = [];
    for (let j = 0; j < this.size; j++) {
      let min = this.workMatrix[0][j];
      for (let i = 1; i < this.size; i++) min = Math.min(min, this.workMatrix[i][j]);
      colMins.push(min);
      this.lowerBound += min;
      for (let i = 0; i < this.size; i++) {
        this.workMatrix[i][j] -= min;
      }
    }
    this.addStep(stepNum++, 'Étape 1b - Réduction par colonnes',
      `Soustraction du minimum de chaque colonne. Minima : [${colMins.join(', ')}]`,
      { colMins: [...colMins], lowerBound: this.lowerBound });

    let iteration = 0;
    const maxIterations = 10;
    let found = false;
    
    while (iteration < maxIterations && !found) {
      iteration++;
      
      // --- Étape 2 : Détermination d'un couplage optimal unique ---
      const marked: { r: number; c: number; type: 'framed' | 'crossed' }[] = [];
      
      while (true) {
        let bestRow = -1;
        let minZerosCount = Infinity;
        let selectedZeroCol = -1;

        // Règle a : Trouver la ligne avec le moins de zéros libres
        for (let i = 0; i < this.size; i++) {
          // Si la ligne a déjà un zéro encadré, on l'ignore
          if (marked.some(m => m.r === i && m.type === 'framed')) continue;

          let freeZerosOnRow = 0;
          let firstFreeColOnRow = -1;

          for (let j = 0; j < this.size; j++) {
            if (Math.abs(this.workMatrix[i][j]) < 1e-9) {
              // Un zéro est libre s'il n'est ni encadré ni barré globalement ou sur sa colonne
              const isMarked = marked.some(m => m.r === i && m.c === j);
              const isColOccupied = marked.some(m => m.c === j && m.type === 'framed');
              if (!isMarked && !isColOccupied) {
                freeZerosOnRow++;
                if (firstFreeColOnRow === -1) firstFreeColOnRow = j;
              }
            }
          }

          if (freeZerosOnRow > 0 && freeZerosOnRow < minZerosCount) {
            minZerosCount = freeZerosOnRow;
            bestRow = i;
            selectedZeroCol = firstFreeColOnRow;
          }
        }

        if (bestRow === -1) break;

        // Étape de sélection de ligne
        this.addStep(stepNum++, `Étape 2 - Sélection Ligne`, 
          `Choix de la ligne [${this.labels[bestRow]}] (${minZerosCount} zéro(s) libre(s)).`,
          { marked: [...marked.map(m => ({...m}))] });

        // Règle b : Encadrer le premier zéro libre
        marked.push({ r: bestRow, c: selectedZeroCol, type: 'framed' });
        this.addStep(stepNum++, `Étape 2 - Zéro Encadré ⓪`, 
          `On encadre le zéro en [${this.labels[bestRow]}, ${this.labels[selectedZeroCol]}].`,
          { marked: [...marked.map(m => ({...m}))] });

        // CRUCIAL : Barrer TOUS les autres zéros sur la même ligne ET même colonne
        // 1. Sur la même ligne
        for (let j = 0; j < this.size; j++) {
          if (j !== selectedZeroCol && Math.abs(this.workMatrix[bestRow][j]) < 1e-9) {
            if (!marked.some(m => m.r === bestRow && m.c === j)) {
              marked.push({ r: bestRow, c: j, type: 'crossed' });
              this.addStep(stepNum++, `Étape 2 - Zéro Barré Ø (Ligne)`, 
                `Zéro en [${this.labels[bestRow]}, ${this.labels[j]}] barré (ligne occupée).`,
                { marked: [...marked.map(m => ({...m}))] });
            }
          }
        }

        // 2. Sur la même colonne
        for (let i = 0; i < this.size; i++) {
          if (i !== bestRow && Math.abs(this.workMatrix[i][selectedZeroCol]) < 1e-9) {
            if (!marked.some(m => m.r === i && m.c === selectedZeroCol)) {
              marked.push({ r: i, c: selectedZeroCol, type: 'crossed' });
              this.addStep(stepNum++, `Étape 2 - Zéro Barré Ø (Colonne)`, 
                `Zéro en [${this.labels[i]}, ${this.labels[selectedZeroCol]}] barré (colonne occupée).`,
                { marked: [...marked.map(m => ({...m}))] });
            }
          }
        }
      }

      const framedZeros = marked.filter(m => m.type === 'framed');
      const count = framedZeros.length;
      
      this.addStep(stepNum++, `Étape 2 - Bilan du Couplage`,
        `Nombre de zéros indépendants encadrés : ${count} / ${this.size}.`,
        { marked: [...marked.map(m => ({...m}))] });
      
      if (count === this.size) {
        this.assignments = framedZeros.map(fz => ({
          worker: this.labels[fz.r],
          job: this.labels[fz.c],
          cost: this.originalMatrix[fz.r][fz.c],
          row: fz.r,
          col: fz.c
        }));
        this.totalCost = this.assignments.reduce((sum, a) => sum + a.cost, 0);
        const assignList = this.assignments.map(a => `${a.worker} → ${a.job} (${a.cost})`).join(' ; ');
        this.addStep(stepNum++, 'Solution optimale - Affectation finale',
          `Couplage complet : ${this.size} zéros encadrés indépendants trouvés. Affectations : ${assignList}. Coût ${this.isMinimization ? 'minimal' : 'maximal'} total = ${this.totalCost}.`,
          { marked: [...marked.map(m => ({...m}))], lowerBound: this.lowerBound, isFinal: true });
        found = true;
        break;
      }
      
      // --- Étape 3 : Marquage (lignes/colonnes) puis couverture ---
      const coverResult = this.findMinimumCoverWithSteps(marked, this.size);
      coverResult.markingSteps.forEach(ms => {
        this.addStep(stepNum++, 'Étape 3 - Marquage', ms.note,
          { marked: [...marked.map(m => ({...m}))], markedRows: [...ms.markedRows], markedCols: [...ms.markedCols] });
      });
      const cover = { rows: coverResult.rows, cols: coverResult.cols };
      this.addStep(stepNum++, 'Étape 3 - Lignes de couverture', `Tracé des lignes de couverture minimales.`,
        { marked: [...marked.map(m => ({...m}))], coveredRows: [...cover.rows], coveredCols: [...cover.cols],
          markedRows: [...coverResult.markedRows], markedCols: [...coverResult.markedCols] });
      
      // --- Étape 4 : Ajustement ---
      const { minVal, newMatrix } = this.adjustMatrix(cover);
      if (minVal === Infinity || minVal === 0) break;
      
      this.lowerBound += minVal;
      this.workMatrix = newMatrix;
      
      this.addStep(stepNum++, 'Étape 4 - Pivot de la matrice', `Ajustement avec le pivot k = ${minVal}.`,
        { coveredRows: [...cover.rows], coveredCols: [...cover.cols], minUncovered: minVal, lowerBound: this.lowerBound });
    }
    
    // Calcul du coût total à partir des affectations exactes trouvées
    this.totalCost = this.assignments.reduce((sum, a) => sum + a.cost, 0);
    
    this.currentStep = 0;
    this.result = { assignments: this.assignments, totalCost: this.totalCost, isOptimal: true };
  }

  addStep(stepNum: number, title: string, description: string, extra: any = {}) {
    this.steps.push({
      stepNum,
      title,
      description,
      matrix: this.workMatrix.map(r => [...r]),
      rowMins: extra.rowMins,
      colMins: extra.colMins,
      marked: extra.marked,
      coveredRows: extra.coveredRows,
      coveredCols: extra.coveredCols,
      markedRows: extra.markedRows,
      markedCols: extra.markedCols,
      minUncovered: extra.minUncovered,
      lowerBound: extra.lowerBound,
      isFinal: extra.isFinal || false
    } as any);
  }

  findMaximumMatching(matrix: number[][]) {
    const n = this.size;
    const pairU = Array(n).fill(-1);
    const pairV = Array(n).fill(-1);
    const adj: number[][] = [];

    for (let i = 0; i < n; i++) {
      adj[i] = [];
      for (let j = 0; j < n; j++) {
        if (Math.abs(matrix[i][j]) < 1e-9) adj[i].push(j);
      }
    }

    const dfs = (u: number, visited: boolean[]): boolean => {
      for (const v of adj[u]) {
        if (visited[v]) continue;
        visited[v] = true;
        if (pairV[v] === -1 || dfs(pairV[v], visited)) {
          pairU[u] = v;
          pairV[v] = u;
          return true;
        }
      }
      return false;
    };

    let matching = 0;
    for (let u = 0; u < n; u++) {
      if (pairU[u] === -1) {
        const visited = Array(n).fill(false);
        if (dfs(u, visited)) matching++;
      }
    }

    const marked: { r: number; c: number; type: 'framed' | 'crossed' }[] = [];
    const assignments: Assignment[] = [];

    for (let i = 0; i < n; i++) {
      if (pairU[i] !== -1) {
        marked.push({ r: i, c: pairU[i], type: 'framed' });
        assignments.push({
          worker: this.labels[i],
          job: this.labels[pairU[i]],
          cost: this.originalMatrix[i][pairU[i]],
          row: i,
          col: pairU[i]
        });
      }
    }

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (Math.abs(matrix[i][j]) < 1e-9 && pairU[i] !== j) {
          marked.push({ r: i, c: j, type: 'crossed' });
        }
      }
    }

    return { marked, count: matching, assignments };
  }

  // Algorithme de marquage classique pour déterminer le support minimal :
  // a. Marquer toute ligne n'ayant pas de zéro encadré ;
  // b. Marquer toute colonne ayant un zéro barré sur une ligne marquée ;
  // c. Marquer toute ligne ayant un zéro encadré dans une colonne marquée ;
  // Revenir à b et s'arrêter lorsqu'aucun autre marquage n'est possible.
  findMinimumCoverWithSteps(marked: any[], n: number) {
    const framed = marked.filter(m => m.type === 'framed');
    const crossed = marked.filter(m => m.type === 'crossed');
    const markedRows = Array(n).fill(false);
    const markedCols = Array(n).fill(false);
    const markingSteps: { markedRows: boolean[]; markedCols: boolean[]; note: string }[] = [];

    // a. Marquer toute ligne n'ayant pas de zéro encadré
    for (let i = 0; i < n; i++) {
      if (!framed.some(z => z.r === i)) markedRows[i] = true;
    }
    markingSteps.push({
      markedRows: [...markedRows], markedCols: [...markedCols],
      note: "a. Marquer toute ligne n'ayant pas de zéro encadré."
    });

    let changed = true;
    while (changed) {
      changed = false;

      // b. Marquer toute colonne ayant un zéro barré sur une ligne marquée
      let bChanged = false;
      for (const z of crossed) {
        if (markedRows[z.r] && !markedCols[z.c]) {
          markedCols[z.c] = true;
          bChanged = true;
        }
      }
      if (bChanged) {
        markingSteps.push({
          markedRows: [...markedRows], markedCols: [...markedCols],
          note: "b. Marquer toute colonne ayant un zéro barré sur une ligne marquée."
        });
        changed = true;
      }

      // c. Marquer toute ligne ayant un zéro encadré dans une colonne marquée
      let cChanged = false;
      for (const z of framed) {
        if (markedCols[z.c] && !markedRows[z.r]) {
          markedRows[z.r] = true;
          cChanged = true;
        }
      }
      if (cChanged) {
        markingSteps.push({
          markedRows: [...markedRows], markedCols: [...markedCols],
          note: "c. Marquer toute ligne ayant un zéro encadré dans une colonne marquée."
        });
        changed = true;
      }
    }

    if (markingSteps.length > 0) {
      markingSteps[markingSteps.length - 1].note += " Aucun autre marquage n'est possible.";
    }

    // Support minimal : lignes non marquées + colonnes marquées
    const rows = Array(n).fill(false);
    const cols = Array(n).fill(false);
    for (let i = 0; i < n; i++) {
      rows[i] = !markedRows[i];
      cols[i] = markedCols[i];
    }

    return { rows, cols, markingSteps, markedRows, markedCols };
  }

  adjustMatrix(cover: { rows: boolean[]; cols: boolean[] }) {
    let minVal = Infinity;
    const n = this.size;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (!cover.rows[i] && !cover.cols[j]) {
          minVal = Math.min(minVal, this.workMatrix[i][j]);
        }
      }
    }
    if (minVal === Infinity || minVal === 0) return { minVal: 0, newMatrix: this.workMatrix.map(r => [...r]) };

    const newMatrix = this.workMatrix.map(r => [...r]);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (!cover.rows[i] && !cover.cols[j]) {
          newMatrix[i][j] -= minVal;
        } else if (cover.rows[i] && cover.cols[j]) {
          newMatrix[i][j] += minVal;
        }
      }
    }

    return { minVal, newMatrix };
  }

  extractAssignments(matrix: number[][]) {
    const result: Assignment[] = [];
    const usedCols = new Set<number>();

    // Méthode simple: prendre le premier zéro disponible par ligne
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (Math.abs(matrix[i][j]) < 1e-9 && !usedCols.has(j)) {
          result.push({
            worker: this.labels[i],
            job: this.labels[j],
            cost: this.originalMatrix[i][j],
            row: i,
            col: j
          });
          usedCols.add(j);
          break;
        }
      }
    }
    
    return result;
  }

  // Navigation
  nextStep() { 
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
    }
  }
  
  prevStep() { 
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }
  
  goToStep(i: number) { 
    this.currentStep = i;
  }

  // Helpers pour template
  isFramed(r: number, c: number, step: MatrixStep) {
    return step.marked?.some(m => m.r === r && m.c === c && m.type === 'framed') || false;
  }
  
  isCrossed(r: number, c: number, step: MatrixStep) {
    return step.marked?.some(m => m.r === r && m.c === c && m.type === 'crossed') || false;
  }
  
  isRowCovered(r: number, step: MatrixStep) {
    return step.coveredRows?.[r] || false;
  }
  
  isColCovered(c: number, step: MatrixStep) {
    return step.coveredCols?.[c] || false;
  }
  
  getCoveredRows(step: MatrixStep): string[] {
    return step.coveredRows?.map((v, i) => v ? this.labels[i] : '').filter(Boolean) || [];
  }
  
  getCoveredCols(step: MatrixStep): string[] {
    return step.coveredCols?.map((v, i) => v ? this.labels[i] : '').filter(Boolean) || [];
  }

  // Helpers pour le marquage (algorithme de marquage a/b/c)
  isMarkedRow(r: number, step: MatrixStep) {
    return (step as any).markedRows?.[r] || false;
  }

  hasMarking(step: MatrixStep): boolean {
    return !!((step as any).markedRows || (step as any).markedCols);
  }
  isMarkedCol(c: number, step: MatrixStep) {
    return (step as any).markedCols?.[c] || false;
  }

  getMarkedRows(step: MatrixStep): string[] {
    return (step as any).markedRows?.map((v: boolean, i: number) => v ? this.labels[i] : '').filter(Boolean) || [];
  }

  getMarkedCols(step: MatrixStep): string[] {
    return (step as any).markedCols?.map((v: boolean, i: number) => v ? this.labels[i] : '').filter(Boolean) || [];
  }

generatePowerPoint() {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9'; // 10in x 7.5in
 
    const BRAND_GREEN = '1A7E2F';
    const BRAND_RED = 'CC0000';
    const TITLE_COLOR = 'CC3300';
 
    const addSlideHeader = (slide: any, subtitle: string) => {
      // Green left badge
      slide.addShape(pptx.ShapeType.rect, { x: 0.1, y: 0.08, w: 1.3, h: 0.5, fill: { color: BRAND_GREEN } });
      slide.addText('RECHERCHE\nOPERATIONNELLE', { x: 0.1, y: 0.08, w: 1.3, h: 0.5, fontSize: 7, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });
      // Title center
      slide.addText('Algorithme et application', { x: 1.5, y: 0.08, w: 7.0, h: 0.5, fontSize: 22, bold: false, color: TITLE_COLOR, align: 'center', valign: 'middle' });
      // Green right badge
      slide.addShape(pptx.ShapeType.rect, { x: 8.6, y: 0.08, w: 1.3, h: 0.5, fill: { color: BRAND_GREEN } });
      slide.addText('Affectation\noptimale', { x: 8.6, y: 0.08, w: 1.3, h: 0.5, fontSize: 8, bold: false, color: 'FFFFFF', align: 'center', valign: 'middle' });
      // Bottom border line
      slide.addShape(pptx.ShapeType.line, { x: 0.1, y: 0.62, w: 9.8, h: 0, line: { color: 'CCCCCC', width: 1 } });
      // Footer
      slide.addText('version 2.1', { x: 0.1, y: 7.1, w: 2, h: 0.3, fontSize: 8, color: '888888' });
      slide.addText('2015', { x: 8.5, y: 7.1, w: 1.4, h: 0.3, fontSize: 8, color: '888888', align: 'right' });
    };
 
    const buildTableData = (matrix: number[][], step: any, n: number) => {
      const rows: any[] = [];
      // Header row
      const hdr: any[] = [{ text: '', options: { fill: { color: 'FFFFFF' }, bold: true } }];
      for (let j = 0; j < n; j++) {
        const colMarked = this.isMarkedCol(j, step);
        hdr.push({
          text: this.labels[j] + (colMarked ? '  +' : ''),
          options: { fill: { color: 'FFFFFF' }, color: colMarked ? BRAND_GREEN : '000000', bold: true, align: 'center' }
        });
      }
      rows.push(hdr);
      for (let i = 0; i < n; i++) {
        const rowMarked = this.isMarkedRow(i, step);
        const row: any[] = [{
          text: this.labels[i] + (rowMarked ? '  +' : ''),
          options: { fill: { color: 'FFFFFF' }, bold: true, align: 'center', color: rowMarked ? BRAND_GREEN : '000000' }
        }];
        for (let j = 0; j < n; j++) {
          const val = matrix[i][j];
          let opts: any = { align: 'center', fontFace: 'Courier New', color: '000000', fill: { color: 'FFFFFF' } };
          if (val === 0) { opts.color = BRAND_RED; opts.bold = true; }
          if (this.isFramed(i, j, step)) {
            opts.fill = { color: 'C8F0C8' };
            opts.border = [
              { pt: 3, color: '2E7D32' }, { pt: 3, color: '2E7D32' },
              { pt: 3, color: '2E7D32' }, { pt: 3, color: '2E7D32' }
            ];
            opts.color = '1B5E20'; opts.bold = true;
          }
          if (this.isCrossed(i, j, step)) { opts.color = '999999'; opts.strike = true; }
          if (this.isRowCovered(i, step)) opts.fill = { color: 'FFF3E0' };
          else if (this.isColCovered(j, step)) opts.fill = { color: 'FFEBEE' };
          row.push({ text: val.toString(), options: opts });
        }
        rows.push(row);
      }
      return rows;
    };
 
    // Calculate responsive table dimensions based on matrix size
    const getTableDims = (n: number) => {
      const maxW = 6.0;
      const colW = Math.min(maxW / (n + 1), 0.85);
      const totalW = colW * (n + 1);
      const rowH = Math.min(0.55, 3.5 / (n + 1));
      const totalH = rowH * (n + 1);
      const startX = (10 - totalW) / 2;
      return { colW, totalW, rowH, totalH, startX };
    };
 
    // ── Slide titre ──
    const slideTitre = pptx.addSlide();
    slideTitre.background = { color: 'F8F8F8' };
    addSlideHeader(slideTitre, '');
    slideTitre.addShape(pptx.ShapeType.rect, { x: 0.5, y: 2.5, w: 9.0, h: 3.0, fill: { color: 'FFFFFF' }, line: { color: 'E0E0E0', width: 1 } });
    slideTitre.addText('Algorithme', { x: 1.0, y: 2.8, w: 8.0, h: 1.0, fontSize: 36, bold: true, color: '1A237E', align: 'center' });
    slideTitre.addText("Résolution pas à pas du problème d'affectation", { x: 1.0, y: 3.9, w: 8.0, h: 0.6, fontSize: 16, color: '555555', align: 'center' });
    slideTitre.addText(`Matrice ${this.size}×${this.size} — ${this.isMinimization ? 'Minimisation' : 'Maximisation'}`, { x: 1.0, y: 4.6, w: 8.0, h: 0.4, fontSize: 12, color: '888888', align: 'center' });
 
    // ── Slide matrice originale ──
    const slideOrig = pptx.addSlide();
    slideOrig.background = { color: 'FFFFFF' };
    addSlideHeader(slideOrig, '');
    slideOrig.addText('Matrice originale des coûts', { x: 0.3, y: 0.7, w: 9.4, h: 0.45, fontSize: 16, bold: true, color: '2C3E50', underline: { style: 'heavy' } });
    const { colW: ow, totalW: otw, rowH: orh, startX: osx } = getTableDims(this.size);
    const origRows: any[] = [[{ text: '', options: { fill: { color: 'FFFFFF' }, bold: true } }]];
    for (let j = 0; j < this.size; j++) origRows[0].push({ text: this.labels[j], options: { fill: { color: 'FFFFFF' }, bold: true, align: 'center', color: '000000' } });
    for (let i = 0; i < this.size; i++) {
      const row: any[] = [{ text: this.labels[i], options: { fill: { color: 'FFFFFF' }, bold: true, align: 'center', color: '000000' } }];
      for (let j = 0; j < this.size; j++) {
        row.push({ text: this.originalMatrix[i][j].toString(), options: { align: 'center', fontFace: 'Courier New', color: '000000', fill: { color: 'FFFFFF' } } });
      }
      origRows.push(row);
    }
    // Also show row mins in red below each row
    const rmins = this.steps.find(s => (s as any).phase === 'etape1a_intro');
    slideOrig.addTable(origRows, { x: osx, y: 1.3, w: otw, colW: Array(this.size + 1).fill(ow), rowH: orh });
    if (rmins?.rowMins) {
      slideOrig.addText(`Minima lignes : [${rmins.rowMins.join(', ')}]`, { x: osx, y: 1.3 + (this.size + 1) * orh + 0.1, w: otw, h: 0.35, fontSize: 11, color: BRAND_RED, bold: true, align: 'center' });
    }
 
    // ── Slides par étapes ──
    this.steps.forEach((step: any) => {
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };
      addSlideHeader(slide, '');
 
      // Title area
      const isFinal = step.isFinal;
      if (isFinal) slide.background = { color: 'F0FFF0' };
      const titleColor = step.phase === 'framed' ? '2E7D32' : step.phase === 'crossed' ? 'AA0000' : isFinal ? '2E7D32' : '2C3E50';
      slide.addText(step.title, { x: 0.3, y: 0.7, w: 9.4, h: 0.42, fontSize: 13, bold: true, color: titleColor });
 
      // Description (italic)
      const descLines = step.description.split('\n');
      slide.addText(descLines[0], { x: 0.3, y: 1.15, w: 9.4, h: 0.35, fontSize: 9, italic: true, color: '555555' });
 
      // Decide display matrix
      let displayMatrix = step.matrix;
      if (step.phase === 'etape1a_row' && step.partialMatrix) {
        // Show partial matrix (cells filled only up to currentRow)
        displayMatrix = step.partialMatrix.map((r: any[]) => r.map((v: any) => v === null ? '·' : v));
      }
 
      const { colW: tw, totalW: ttw, rowH: trh, startX: tsx } = getTableDims(this.size);
      const tableY = 1.55;
      const tableRows = buildTableData(displayMatrix, step, this.size);
      slide.addTable(tableRows, {
        x: tsx,
        y: tableY,
        w: ttw,
        colW: Array(this.size + 1).fill(tw),
        rowH: trh,
        border: { type: 'solid', color: 'CCCCCC', pt: 0.5 }
      });
 
      const infoY = tableY + (this.size + 1) * trh + 0.15;
 
      // Details below the table
      const details: string[] = [];
      if (step.rowMins && step.phase === 'etape1a_intro') details.push(`Minima lignes : [${step.rowMins.join(', ')}]`);
      if (step.colMins && step.phase === 'etape1b_intro') details.push(`Minima colonnes : [${step.colMins.join(', ')}]`);
      if (step.lowerBound !== undefined) details.push(`Borne inférieure (B) = ${step.lowerBound}`);
      if (step.minUncovered !== undefined) details.push(`Minimum non-couvert k = ${step.minUncovered}`);
      if (step.coveredRows || step.coveredCols) {
        const cr = this.getCoveredRows(step).join(', ') || 'aucune';
        const cc = this.getCoveredCols(step).join(', ') || 'aucune';
        details.push(`Lignes couvertes : [${cr}]   Colonnes couvertes : [${cc}]`);
      }
 
      if (details.length > 0) {
        slide.addShape(pptx.ShapeType.rect, { x: tsx, y: infoY, w: ttw, h: 0.28 * details.length + 0.1, fill: { color: 'F5F5F5' }, line: { color: 'DDDDDD', width: 0.5 } });
        details.forEach((d, idx) => {
          slide.addText(d, { x: tsx + 0.1, y: infoY + 0.05 + idx * 0.28, w: ttw - 0.2, h: 0.26, fontSize: 9, color: '333333', bold: d.includes('Borne') || d.includes('Minimum') });
        });
      }
 
      // For final slide: show assignments on the right side (bipartite graph style)
      if (isFinal && this.result) {
        const gx = tsx + ttw + 0.5;
        const gw = Math.min(9.7 - gx, 2.8);
        slide.addShape(pptx.ShapeType.rect, { x: gx, y: tableY, w: gw, h: (this.size + 1) * trh, fill: { color: 'F0FFF0' }, line: { color: '4CAF50', width: 1 } });
        slide.addText(`Coût total = ${this.result.totalCost}`, { x: gx + 0.05, y: tableY + 0.1, w: gw - 0.1, h: 0.35, fontSize: 12, bold: true, color: '2E7D32', align: 'center' });
        const assignmentStartY = tableY + 0.55;
        const assignmentHeight = Math.max(0.25, ((this.size + 1) * trh - 0.55) / this.result.assignments.length);
        this.result.assignments.forEach((a, idx) => {
          slide.addText(`${a.worker} → ${a.job}`, { x: gx + 0.08, y: assignmentStartY + idx * assignmentHeight, w: gw - 0.16, h: assignmentHeight * 0.6, fontSize: 9, color: '1B5E20', bold: true });
          slide.addText(`(${a.cost})`, { x: gx + 0.08, y: assignmentStartY + idx * assignmentHeight + assignmentHeight * 0.65, w: gw - 0.16, h: assignmentHeight * 0.3, fontSize: 8, color: '555555', italic: true });
        });
      }
    });
 
    pptx.writeFile({ fileName: 'algorithme_complet.pptx' });
  }

generatePDF() {
  const doc = new jsPDF();
  const labels = this.labels;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(26, 35, 126); // #1a237e (Votre couleur H1)
  doc.text("Algorithme - Problème d'Affectation", 14, 20);
  
  doc.setFontSize(12);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(102, 102, 102);
  doc.text(`Type d'optimisation : ${this.isMinimization ? 'Minimisation (coûts)' : 'Maximisation (profits)'}`, 14, 28);
  
  let currentY = 35;

  this.steps.forEach((step, index) => {
    if (index > 0) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80); // #2c3e50
    doc.text(`Étape ${step.stepNum} : ${step.title}`, 14, currentY);
    currentY += 6;

    // Description
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(102, 102, 102);
    const splitDesc = doc.splitTextToSize(step.description, 180);
    doc.text(splitDesc, 14, currentY);
    currentY += (splitDesc.length * 5) + 5;

    // Préparation des données du tableau
    // En-têtes : ['Ligne/Col', 'A', 'B', 'C', ...]
    const headers = [['', ...labels.slice(0, this.size)]];
    const rows = step.matrix.map((row, i) => [labels[i], ...row]);

    // Génération du tableau stylisé
    autoTable(doc, {
      startY: currentY,
      head: headers,
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [33, 150, 243], textColor: [255, 255, 255] }, // Bleu #2196f3
      styles: { font: "Courier", halign: 'center', valign: 'middle' },
      columnStyles: { 0: { font: "Helvetica", fontStyle: 'bold', fillColor: [240, 240, 240] } }, // Colonne des Workers
      
      // Coloriage dynamique des cellules selon l'état (CSS-like)
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index > 0) {
          const rowIndex = data.row.index;
          const colIndex = data.column.index - 1; // Ajustement à cause de la colonne Worker
          const val = step.matrix[rowIndex][colIndex];

          // 1. Zéro d'affectation potentiel
          if (val === 0) {
            data.cell.styles.fillColor = [232, 245, 233]; // #e8f5e9 (Vert clair)
            data.cell.styles.textColor = [46, 125, 50];   // #2e7d32
            data.cell.styles.fontStyle = 'bold';
          }
          
          // 2. Cellule Encadrée (Framed)
          if (this.isFramed(rowIndex, colIndex, step)) {
            data.cell.styles.fillColor = [200, 230, 201]; // #c8e6c9
            data.cell.styles.lineWidth = 1;
            data.cell.styles.lineColor = [76, 175, 80];   // #4caf50
          }
          
          // 3. Lignes / Colonnes Couvertes (Rayées)
          if (this.isRowCovered(rowIndex, step)) {
            data.cell.styles.fillColor = [255, 243, 224]; // #fff3e0 (Orange clair)
          } else if (this.isColCovered(colIndex, step)) {
            data.cell.styles.fillColor = [255, 235, 235]; // #ffebee (Rouge clair)
          }

          // 4. Cellule Barrée (Crossed)
          if (this.isCrossed(rowIndex, colIndex, step)) {
            data.cell.styles.textColor = [158, 158, 158]; // #9e9e9e
          }
        }
      }
    });

    // Détails textuels en dessous du tableau
    currentY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);

    if (step.rowMins) doc.text(`Minimal par ligne : [${step.rowMins.join(', ')}]`, 14, currentY), currentY += 5;
    if (step.colMins) doc.text(`Minimal par colonne : [${step.colMins.join(', ')}]`, 14, currentY), currentY += 5;
    if (step.minUncovered !== undefined) doc.text(`Minimum non-couvert : ${step.minUncovered}`, 14, currentY), currentY += 5;
    if (step.lowerBound !== undefined) {
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(33, 150, 243);
      doc.text(`Minorant (borne inférieure) : ${step.lowerBound}`, 14, currentY);
      currentY += 5;
    }
  });

  // --- Page de Résultat Final ---
  if (this.result) {
    doc.addPage(); 
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(46, 125, 50);
    doc.text("Résultat Final", 14, 25);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Coût total : ${this.result.totalCost}`, 14, 40);
    
    doc.setFontSize(12);
    doc.text("Affectations optimales :", 14, 52);
    
    doc.setFont("Helvetica", "normal");
    let assignmentY = 60;
    this.result.assignments.forEach(assign => {
      doc.text(`  • ${assign.worker}  -->  ${assign.job}   (coût: ${assign.cost})`, 14, assignmentY);
      assignmentY += 6;
    });
  }

  doc.save('algorithme_minimisation.pdf');
}
}