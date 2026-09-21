import { Injectable } from '@nestjs/common';
import * as stringSimilarity from 'string-similarity';

@Injectable()
export class MatchScoringService {
  /**
   * Normaliza a string para comparação: minúsculo, remove pontuações (exceto +, #) e espaços.
   * Exemplo: "React.js" -> "reactjs", "Node JS" -> "nodejs", "C#" -> "c#"
   */
  public normalize(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[^\w\s+#]/g, '') // Remove pontuações exceto # e + (útil para linguagens C#, C++)
      .replace(/\s+/g, '')       // Remove espaços
      .trim();
  }

  /**
   * Compara uma skill do candidato com uma qualificação da vaga.
   * Retorna um score de 0 a 1 (Coeficiente de Sørensen-Dice).
   */
  public calculateSimilarity(skill: string, requirement: string): number {
    const normSkill = this.normalize(skill);
    const normReq = this.normalize(requirement);
    
    // Exact match após normalização
    if (normSkill === normReq) return 1.0;
    // Se a string contiver a outra após normalizada, pode ser considerado alto (ajuste fino)
    if (normSkill.includes(normReq) || normReq.includes(normSkill)) return 0.85;
    
    return stringSimilarity.compareTwoStrings(normSkill, normReq);
  }

  /**
   * Calcula o match score global entre os requisitos da vaga e as skills do candidato.
   * @param candidateSkills Array de skills do candidato
   * @param jobRequirements Array de requisitos obrigatórios da vaga
   * @returns Número de 0 a 100
   */
  public calculateMatchScore(candidateSkills: string[], jobRequirements: string[]): number {
    if (!jobRequirements || jobRequirements.length === 0) return 100; // Vaga sem requisitos
    if (!candidateSkills || candidateSkills.length === 0) return 0;   // Candidato sem skills

    const TOLERANCE_THRESHOLD = 0.75;
    let matchCount = 0;

    for (const req of jobRequirements) {
      let bestMatchForReq = 0;

      for (const skill of candidateSkills) {
        const score = this.calculateSimilarity(skill, req);
        if (score > bestMatchForReq) {
          bestMatchForReq = score;
        }
      }

      // Se superou a tolerância, o requisito foi atendido
      if (bestMatchForReq >= TOLERANCE_THRESHOLD) {
        matchCount++;
      }
    }

    const percentage = (matchCount / jobRequirements.length) * 100;
    return Math.round(percentage); // Retorna inteiro exato
  }
}
