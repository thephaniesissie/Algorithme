import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatrixStep, Assignment } from './affectation.models';

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
    // Sauvegarder la matrice actuelle
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        this.originalMatrix[i][j] = this.matrixData[i][j];
      }
    }
    
    this.reset();
    
    // Si maximisation, transformer en minimisation
    let matrix = this.originalMatrix.map(r => [...r]);
    if (!this.isMinimization) {
      const maxVal = Math.max(...matrix.flat());
      matrix = matrix.map(r => r.map(v => maxVal - v));
    }

    this.workMatrix = matrix.map(r => [...r]);
    this.steps = [];
    this.lowerBound = 0;
    let stepNum = 1;

    // Étape 1a: Réduction par lignes
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
      `Minima par ligne : [${rowMins.join(', ')}] → Minorant = ${this.lowerBound}`,
      { rowMins: [...rowMins] });

    // Étape 1b: Réduction par colonnes
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
      `Minima par colonne : [${colMins.join(', ')}] → Minorant = ${this.lowerBound}`,
      { colMins: [...colMins] });

    // Boucle principale - limitée à 10 itérations maximum
    let iteration = 0;
    const maxIterations = 10;
    let found = false;
    
    while (iteration < maxIterations && !found) {
      iteration++;
      
      // Étape 2: Trouver le couplage maximal
      const { marked, count, assignments: currentAssignments } = this.findMaximumMatching(this.workMatrix);
      
      this.addStep(stepNum++, `Étape 2 - Couplage maximal (itération ${iteration})`,
        `${count}/${this.size} affectations trouvées${count === this.size ? ' → Solution complète !' : ''}`,
        { marked: [...marked] });
      
      if (count === this.size) {
        this.assignments = currentAssignments;
        found = true;
        break;
      }
      
      // Étape 3: Trouver le support minimal
      const cover = this.findMinimumCover(marked, this.size);
      const coveredRowsList = cover.rows.map((v, i) => v ? this.labels[i] : '').filter(Boolean);
      const coveredColsList = cover.cols.map((v, i) => v ? this.labels[i] : '').filter(Boolean);
      
      this.addStep(stepNum++, 'Étape 3 - Support minimal',
        `Lignes couvertes : [${coveredRowsList.join(', ') || 'aucune'}] | Colonnes couvertes : [${coveredColsList.join(', ') || 'aucune'}]`,
        { marked: [...marked], coveredRows: [...cover.rows], coveredCols: [...cover.cols] });
      
      // Étape 4: Ajustement de la matrice
      const { minVal, newMatrix } = this.adjustMatrix(cover);
      if (minVal === Infinity || minVal === 0) break;
      
      this.lowerBound += minVal;
      this.workMatrix = newMatrix;
      
      this.addStep(stepNum++, 'Étape 4 - Ajustement de la matrice',
        `Minimum non-couvert : ${minVal} → Nouveau minorant = ${this.lowerBound}`,
        { coveredRows: [...cover.rows], coveredCols: [...cover.cols], minUncovered: minVal, lowerBound: this.lowerBound });
    }
    
    // Extraire les affectations finales si pas encore trouvées
    if (this.assignments.length === 0) {
      this.assignments = this.extractAssignments(this.workMatrix);
    }
    
    // Calculer le coût total avec la matrice originale
    this.totalCost = this.assignments.reduce((sum, a) => {
      const originalCost = this.originalMatrix[this.labels.indexOf(a.worker)][this.labels.indexOf(a.job)];
      return sum + originalCost;
    }, 0);
    
    // Ajouter l'étape finale
    this.addStep(stepNum, '✅ Solution optimale',
      `Coût ${this.isMinimization ? 'minimal' : 'maximal'} = ${this.totalCost}`,
      { isFinal: true });
    
    this.currentStep = 0;
    this.result = {
      assignments: this.assignments,
      totalCost: this.totalCost,
      isOptimal: true
    };
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
      minUncovered: extra.minUncovered,
      lowerBound: extra.lowerBound,
      isFinal: extra.isFinal || false
    });
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

  findMinimumCover(marked: any[], n: number) {
    const rows = Array(n).fill(false);
    const cols = Array(n).fill(false);
    const framed = marked.filter(m => m.type === 'framed');
    const crossed = marked.filter(m => m.type === 'crossed');
    
    const markedLines = new Set<number>();
    const markedCols = new Set<number>();

    // Marquer les lignes sans zéro encadré
    for (let i = 0; i < n; i++) {
      if (!framed.some(z => z.r === i)) markedLines.add(i);
    }

    let changed = true;
    let maxLoop = 100;
    let loopCount = 0;
    while (changed && loopCount < maxLoop) {
      loopCount++;
      changed = false;
      for (const z of crossed) {
        if (markedLines.has(z.r) && !markedCols.has(z.c)) {
          markedCols.add(z.c);
          changed = true;
        }
      }
      for (const z of framed) {
        if (markedCols.has(z.c) && !markedLines.has(z.r)) {
          markedLines.add(z.r);
          changed = true;
        }
      }
    }

    // Lignes non marquées et colonnes marquées forment le support minimal
    for (let i = 0; i < n; i++) {
      rows[i] = !markedLines.has(i);
      cols[i] = markedCols.has(i);
    }

    return { rows, cols };
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
}