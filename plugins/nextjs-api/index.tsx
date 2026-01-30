/**
 * Next.js API Route plugin for jtcsv
 * Provides API routes for CSV/JSON conversion in Next.js applications
 * @module plugins/nextjs-api
 */

// Note: Next.js types are optional - users need to install @types/next
// We use conditional imports to avoid breaking the build
type NextApiRequest = any;
type NextApiResponse = any;

import type { CsvToJsonOptions, JsonToCsvOptions } from '../../src/types';
import { csvToJson, jsonToCsv } from '../../index-core';
import { JtcsvError } from '../../errors';

/**
 * Configuration options for the Next.js API plugin
 */
export interface NextJsApiOptions {
  /** Maximum request body size in bytes (default: 10MB) */
  maxBodySize?: number;
  /** Allowed HTTP methods (default: ['POST']) */
  allowedMethods?: string[];
  /** Enable CORS headers (default: true) */
  enableCors?: boolean;
  /** Custom error handler */
  onError?: (error: Error, req: NextApiRequest, res: NextApiResponse) => void;
}

/**
 * Default configuration for the Next.js API plugin
 */
const DEFAULT_OPTIONS: NextJsApiOptions = {
  maxBodySize: 10 * 1024 * 1024, // 10MB
  allowedMethods: ['POST'],
  enableCors: true,
};

/**
 * Creates a Next.js API route handler for CSV to JSON conversion
 * @param options - Plugin configuration options
 * @returns Next.js API route handler
 */
export function createCsvToJsonApiHandler(options?: NextJsApiOptions) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
      // Set CORS headers if enabled
      if (config.enableCors) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      }

      // Handle OPTIONS request for CORS preflight
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      // Validate HTTP method
      if (!config.allowedMethods?.includes(req.method || '')) {
        return res.status(405).json({
          error: 'Method Not Allowed',
          message: `Only ${config.allowedMethods?.join(', ')} methods are allowed`,
        });
      }

      // Validate content type
      const contentType = req.headers['content-type'] || '';
      if (!contentType.includes('text/csv') && !contentType.includes('application/csv')) {
        return res.status(400).json({
          error: 'Invalid Content-Type',
          message: 'Content-Type must be text/csv or application/csv',
        });
      }

      // Get request body
      let csvData: string;
      if (typeof req.body === 'string') {
        csvData = req.body;
      } else if (Buffer.isBuffer(req.body)) {
        csvData = req.body.toString('utf-8');
      } else {
        return res.status(400).json({
          error: 'Invalid Request Body',
          message: 'Request body must be a CSV string or buffer',
        });
      }

      // Validate body size
      if (csvData.length > (config.maxBodySize || DEFAULT_OPTIONS.maxBodySize!)) {
        return res.status(413).json({
          error: 'Payload Too Large',
          message: `Request body exceeds maximum size of ${config.maxBodySize} bytes`,
        });
      }

      // Parse query parameters for CSV options
      const csvOptions: CsvToJsonOptions = {
        delimiter: req.query.delimiter as string || ',',
        hasHeaders: req.query.hasHeaders !== 'false',
        trim: req.query.trim === 'true',
        maxRows: req.query.maxRows ? parseInt(req.query.maxRows as string, 10) : undefined,
        parseNumbers: req.query.parseNumbers === 'true',
        parseBooleans: req.query.parseBooleans === 'true',
        useFastPath: req.query.useFastPath !== 'false',
        preventCsvInjection: req.query.preventCsvInjection !== 'false',
        rfc4180Compliant: req.query.rfc4180Compliant !== 'false',
      };

      // Convert CSV to JSON
      const result = await csvToJson(csvData, csvOptions);

      // Return successful response
      return res.status(200).json({
        success: true,
        data: result,
        metadata: {
          rowCount: Array.isArray(result) ? result.length : 0,
          convertedAt: new Date().toISOString(),
        },
      });

    } catch (error) {
      // Handle errors
      if (config.onError) {
        config.onError(error as Error, req, res);
      }

      if (error instanceof JtcsvError) {
        return res.status(400).json({
          error: error.name,
          message: error.message,
          code: error.code,
        });
      }

      const err = error as Error;
      return res.status(500).json({
        error: 'Internal Server Error',
        message: err.message || 'Unknown error occurred',
      });
    }
  };
}

/**
 * Creates a Next.js API route handler for JSON to CSV conversion
 * @param options - Plugin configuration options
 * @returns Next.js API route handler
 */
export function createJsonToCsvApiHandler(options?: NextJsApiOptions) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
      // Set CORS headers if enabled
      if (config.enableCors) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      }

      // Handle OPTIONS request for CORS preflight
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      // Validate HTTP method
      if (!config.allowedMethods?.includes(req.method || '')) {
        return res.status(405).json({
          error: 'Method Not Allowed',
          message: `Only ${config.allowedMethods?.join(', ')} methods are allowed`,
        });
      }

      // Validate content type
      const contentType = req.headers['content-type'] || '';
      if (!contentType.includes('application/json')) {
        return res.status(400).json({
          error: 'Invalid Content-Type',
          message: 'Content-Type must be application/json',
        });
      }

      // Get request body
      let jsonData: any;
      if (typeof req.body === 'string') {
        try {
          jsonData = JSON.parse(req.body);
        } catch {
          return res.status(400).json({
            error: 'Invalid JSON',
            message: 'Request body must be valid JSON',
          });
        }
      } else if (typeof req.body === 'object' && req.body !== null) {
        jsonData = req.body;
      } else {
        return res.status(400).json({
          error: 'Invalid Request Body',
          message: 'Request body must be JSON',
        });
      }

      // Validate body size
      const bodySize = JSON.stringify(jsonData).length;
      if (bodySize > (config.maxBodySize || DEFAULT_OPTIONS.maxBodySize!)) {
        return res.status(413).json({
          error: 'Payload Too Large',
          message: `Request body exceeds maximum size of ${config.maxBodySize} bytes`,
        });
      }

      // Parse query parameters for CSV options
      const csvOptions: JsonToCsvOptions = {
        delimiter: req.query.delimiter as string || ',',
        includeHeaders: req.query.includeHeaders !== 'false',
        preventCsvInjection: req.query.preventCsvInjection !== 'false',
        rfc4180Compliant: req.query.rfc4180Compliant !== 'false',
        flatten: req.query.flatten === 'true',
        flattenSeparator: req.query.flattenSeparator as string || '.',
        flattenMaxDepth: req.query.flattenMaxDepth ? parseInt(req.query.flattenMaxDepth as string, 10) : undefined,
        arrayHandling: req.query.arrayHandling as 'stringify' | 'join' | 'expand' || 'stringify',
      };

      // Convert JSON to CSV
      const result = await jsonToCsv(jsonData, csvOptions);

      // Return successful response
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="converted.csv"');
      
      return res.status(200).send(result);

    } catch (error) {
      // Handle errors
      if (config.onError) {
        config.onError(error as Error, req, res);
      }

      if (error instanceof JtcsvError) {
        return res.status(400).json({
          error: error.name,
          message: error.message,
          code: error.code,
        });
      }

      const err = error as Error;
      return res.status(500).json({
        error: 'Internal Server Error',
        message: err.message || 'Unknown error occurred',
      });
    }
  };
}

/**
 * Creates a Next.js API route handler for bidirectional conversion
 * @param options - Plugin configuration options
 * @returns Next.js API route handler that can handle both CSV→JSON and JSON→CSV
 */
export function createBidirectionalApiHandler(options?: NextJsApiOptions) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
      // Set CORS headers if enabled
      if (config.enableCors) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      }

      // Handle OPTIONS request for CORS preflight
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      // Validate HTTP method
      if (!config.allowedMethods?.includes(req.method || '')) {
        return res.status(405).json({
          error: 'Method Not Allowed',
          message: `Only ${config.allowedMethods?.join(', ')} methods are allowed`,
        });
      }

      // Determine conversion direction from query parameter or content type
      const direction = req.query.direction as string || 
        (req.headers['content-type']?.includes('text/csv') ? 'csvToJson' : 'jsonToCsv');

      if (direction === 'csvToJson') {
        // Use CSV to JSON handler
        const csvHandler = createCsvToJsonApiHandler(config);
        return csvHandler(req, res);
      } else if (direction === 'jsonToCsv') {
        // Use JSON to CSV handler
        const jsonHandler = createJsonToCsvApiHandler(config);
        return jsonHandler(req, res);
      } else {
        return res.status(400).json({
          error: 'Invalid Direction',
          message: 'Direction must be either "csvToJson" or "jsonToCsv"',
        });
      }

    } catch (error) {
      // Handle errors
      if (config.onError) {
        config.onError(error as Error, req, res);
      }

      return res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };
}

/**
 * Example Next.js API route implementation
 * Usage in pages/api/convert.ts:
 * 
 * import { createBidirectionalApiHandler } from '@jtcsv/nextjs-api';
 * 
 * export default createBidirectionalApiHandler({
 *   maxBodySize: 5 * 1024 * 1024, // 5MB
 *   allowedMethods: ['POST', 'GET'],
 * });
 */

export default {
  createCsvToJsonApiHandler,
  createJsonToCsvApiHandler,
  createBidirectionalApiHandler,
};