import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Servicio de cifrado para proteger secretos sensibles
 * Implementa AES-256-GCM para cifrado autenticado
 *
 * Cumple con: Documento de Requerimientos - Sección 6. Seguridad
 * - Gestión de secretos cifrada
 * - Certificados SAT fuera del código
 */
@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_LENGTH = 16;
  private readonly AUTH_TAG_LENGTH = 16;
  private readonly SALT_LENGTH = 32;
  private readonly KEY_LENGTH = 32;
  private readonly ITERATIONS = 100000;

  private masterKey: Buffer;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');

    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error(
        'ENCRYPTION_KEY debe estar configurada en las variables de entorno con al menos 32 caracteres. ' +
        'Genere una clave segura con: openssl rand -base64 32'
      );
    }

    // Derivar clave maestra usando PBKDF2
    const salt = crypto.createHash('sha256').update('nomina-master-salt').digest();
    this.masterKey = crypto.pbkdf2Sync(
      encryptionKey,
      salt,
      this.ITERATIONS,
      this.KEY_LENGTH,
      'sha512'
    );
  }

  /**
   * Cifra un texto plano usando AES-256-GCM
   * @param plaintext Texto a cifrar
   * @returns Texto cifrado en formato: iv:authTag:ciphertext (base64)
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      return plaintext;
    }

    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.masterKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Formato: iv:authTag:ciphertext (todo en base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * Descifra un texto cifrado
   * @param encryptedText Texto cifrado en formato: iv:authTag:ciphertext
   * @returns Texto plano original
   */
  decrypt(encryptedText: string): string {
    if (!encryptedText) {
      return encryptedText;
    }

    // Si no tiene el formato esperado, asumir que es texto plano (migración)
    if (!encryptedText.includes(':')) {
      return encryptedText;
    }

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      // Texto en formato incorrecto, retornar como está
      return encryptedText;
    }

    try {
      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      const ciphertext = parts[2];

      const decipher = crypto.createDecipheriv(this.ALGORITHM, this.masterKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // Si falla el descifrado, puede ser texto plano sin cifrar (legacy)
      console.warn('No se pudo descifrar el texto, puede ser dato legacy sin cifrar');
      return encryptedText;
    }
  }

  /**
   * Verifica si un texto está cifrado con este servicio
   * @param text Texto a verificar
   * @returns true si parece estar cifrado
   */
  isEncrypted(text: string): boolean {
    if (!text) return false;
    const parts = text.split(':');
    return parts.length === 3 && parts.every(p => this.isBase64(p));
  }

  /**
   * Hash seguro para comparaciones (no reversible)
   * @param value Valor a hashear
   * @returns Hash en hexadecimal
   */
  hash(value: string): string {
    return crypto
      .createHmac('sha256', this.masterKey)
      .update(value)
      .digest('hex');
  }

  /**
   * Genera un token aleatorio seguro
   * @param length Longitud del token en bytes
   * @returns Token en base64
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  private isBase64(str: string): boolean {
    try {
      return Buffer.from(str, 'base64').toString('base64') === str;
    } catch {
      return false;
    }
  }
}
