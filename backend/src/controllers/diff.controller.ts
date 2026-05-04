import fs from 'node:fs/promises';

import type { NextFunction, Request, Response } from 'express';

import {
  attachJobFile,
  createCompareJob,
  saveCompareResult
} from '../services/compareJob.service.js';
import { detectFileType, normalizeRequestedFileType } from '../services/fileType.service.js';
import { buildFilterInfo, normalizeFilterOptions } from '../services/filter.service.js';
import { compareCsvText } from '../services/csvDiff.service.js';
import { compareExcelBuffers } from '../services/excelDiff.service.js';
import {
  computeSha256FromFile,
  createUploadedFileRecord,
  type UploadedFileRecord
} from '../services/fileRecord.service.js';
import { compareJsonText } from '../services/jsonDiff.service.js';
import {
  buildAdvancedRulesInfo,
  defaultAdvancedRuleOptions,
  normalizeAdvancedRuleOptions
} from '../services/advancedRules.service.js';
import {
  buildNormalizationInfo,
  defaultNormalizationOptions,
  normalizeNormalizationOptions
} from '../services/normalization.service.js';
import { emptyPerformanceInfo } from '../services/performance.service.js';
import { compareTextLines } from '../services/textDiff.service.js';
import {
  compareVersionChain,
  emptyVersionChainResponse,
  type VersionChainInput
} from '../services/versionChain.service.js';
import type {
  AppliedFilterInfo,
  CompareResponse,
  SupportedFileType,
  VersionChainResponse
} from '../types/api.js';

function getUploadedFileNames(req: Request) {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;

  return {
    leftFile: files?.leftFile?.[0]?.originalname ?? null,
    rightFile: files?.rightFile?.[0]?.originalname ?? null
  };
}

function getUploadedFiles(req: Request) {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;

  return {
    leftFile: files?.leftFile?.[0],
    rightFile: files?.rightFile?.[0]
  };
}

function readInputText(file: Express.Multer.File | undefined, value: unknown) {
  if (file) {
    return {
      exists: true,
      buffer: null,
      filePath: file.path,
      size: file.size,
      source: 'file',
      text: null
    };
  }

  if (typeof value === 'string') {
    return {
      exists: true,
      buffer: null,
      filePath: null,
      size: Buffer.byteLength(value),
      source: 'text',
      text: value
    };
  }

  return {
    exists: false,
    buffer: null,
    filePath: null,
    size: 0,
    source: null,
    text: null
  };
}

async function readInputAsText(input: ReturnType<typeof readInputText>) {
  if (typeof input.text === 'string') {
    return input.text;
  }

  if (input.filePath) {
    return fs.readFile(input.filePath, 'utf8');
  }

  return '';
}

async function readInputAsBuffer(input: ReturnType<typeof readInputText>) {
  if (input.buffer) {
    return input.buffer;
  }

  if (input.filePath) {
    return fs.readFile(input.filePath);
  }

  if (typeof input.text === 'string') {
    return Buffer.from(input.text);
  }

  return null;
}

async function cleanupUploadedFiles(req: Request) {
  const files = req.files as Record<string, Express.Multer.File[]> | Express.Multer.File[] | undefined;
  const uploadedFiles = Array.isArray(files) ? files : Object.values(files ?? {}).flat();

  await Promise.all(
    uploadedFiles
      .map((file) => file.path)
      .filter(Boolean)
      .map((filePath) => fs.unlink(filePath).catch(() => undefined))
  );
}

function getVersionFiles(req: Request) {
  return (Array.isArray(req.files) ? req.files : []) as Express.Multer.File[];
}

async function recordUploadedFileMetadata({
  fileType,
  files,
  sourceType,
  userId
}: {
  fileType: SupportedFileType;
  files: Array<Express.Multer.File | undefined>;
  sourceType: string;
  userId: number | undefined;
}): Promise<Array<UploadedFileRecord | null>> {
  if (!userId) {
    return files.map(() => null);
  }

  return Promise.all(
    files.map(async (file) => {
      if (!file) {
        return null;
      }

      try {
        const sha256 = await computeSha256FromFile(file.path);

        return createUploadedFileRecord(userId, {
          originalName: file.originalname,
          storedName: file.filename,
          fileType,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          sha256,
          storagePath: file.path,
          sourceType
        });
      } catch (error) {
        console.warn('文件元数据记录失败', error);
        return null;
      }
    })
  );
}

function getDisplayName(file: Express.Multer.File | undefined, fallback: string) {
  return file?.originalname ?? fallback;
}

function buildPairJobTitle(fileType: SupportedFileType, leftName: string, rightName: string) {
  return `${fileType.toUpperCase()} 对比：${leftName} -> ${rightName}`;
}

async function persistPairCompareJob({
  durationMs,
  fileType,
  leftDisplayName,
  leftFile,
  response,
  rightDisplayName,
  rightFile,
  userId
}: {
  durationMs: number;
  fileType: SupportedFileType;
  leftDisplayName: string;
  leftFile: Express.Multer.File | undefined;
  response: CompareResponse;
  rightDisplayName: string;
  rightFile: Express.Multer.File | undefined;
  userId: number | undefined;
}) {
  if (!userId) {
    return;
  }

  try {
    const fileRecords = await recordUploadedFileMetadata({
      fileType,
      files: [leftFile, rightFile],
      sourceType: 'compare-upload',
      userId
    });
    const job = createCompareJob(userId, {
      title: buildPairJobTitle(fileType, leftDisplayName, rightDisplayName),
      fileType,
      inputMode: 'pair',
      status: 'completed',
      algorithm: response.performance.algorithm,
      durationMs,
      resultCount: response.summary.total,
      resultTruncated: response.performance.resultTruncated
    });

    attachJobFile(job.id, {
      fileId: fileRecords[0]?.id ?? null,
      role: 'left',
      versionIndex: null,
      displayName: leftDisplayName
    });
    attachJobFile(job.id, {
      fileId: fileRecords[1]?.id ?? null,
      role: 'right',
      versionIndex: null,
      displayName: rightDisplayName
    });

    response.jobId = String(job.id);
    saveCompareResult(job.id, response);
  } catch (error) {
    console.warn('对比任务保存失败', error);
  }
}

async function persistVersionCompareJob({
  durationMs,
  fileType,
  files,
  response,
  userId
}: {
  durationMs: number;
  fileType: SupportedFileType;
  files: Express.Multer.File[];
  response: VersionChainResponse;
  userId: number | undefined;
}) {
  if (!userId) {
    return;
  }

  try {
    const fileRecords = await recordUploadedFileMetadata({
      fileType,
      files,
      sourceType: 'version-compare-upload',
      userId
    });
    const resultTruncated = response.intervals.some((interval) => interval.performance.resultTruncated);
    const job = createCompareJob(userId, {
      title: `${fileType.toUpperCase()} 多版本对比：${files.length} 个版本`,
      fileType,
      inputMode: 'versions',
      status: 'completed',
      algorithm: 'version-chain',
      durationMs,
      resultCount: response.trend.totalDifferences,
      resultTruncated
    });

    files.forEach((file, index) => {
      attachJobFile(job.id, {
        fileId: fileRecords[index]?.id ?? null,
        role: 'version',
        versionIndex: index,
        displayName: file.originalname
      });
    });

    response.jobId = String(job.id);
    saveCompareResult(job.id, response);
  } catch (error) {
    console.warn('多版本对比任务保存失败', error);
  }
}

function createEmptyResponse(
  fileType: SupportedFileType,
  filters: AppliedFilterInfo,
  message: string,
  received: Record<string, unknown> = {}
): CompareResponse {
  return {
    success: false,
    fileType,
    summary: {
      total: 0,
      added: 0,
      removed: 0,
      modified: 0
    },
    result: [],
    filters,
    advancedRules: buildAdvancedRulesInfo(defaultAdvancedRuleOptions),
    normalization: buildNormalizationInfo(defaultNormalizationOptions),
    performance: emptyPerformanceInfo(),
    message,
    received
  };
}

export async function compareDiff(req: Request, res: Response<CompareResponse>, next: NextFunction) {
  const startedAt = Date.now();
  let resolvedFileType: SupportedFileType = 'text';

  try {
    const filterOptions = normalizeFilterOptions(req.body);
    const filters = buildFilterInfo(filterOptions);
    const advancedRuleOptions = normalizeAdvancedRuleOptions(req.body);
    const normalizationOptions = normalizeNormalizationOptions(req.body);
    const requestedFileType = normalizeRequestedFileType(req.body.fileType);

    if (!requestedFileType) {
      res
        .status(400)
        .json(createEmptyResponse('text', filters, '当前仅支持 text、json、csv 和 excel 对比。'));
      return;
    }

    const { leftFile, rightFile } = getUploadedFiles(req);
    const uploadedFiles = getUploadedFileNames(req);
    const leftInput = readInputText(leftFile, req.body.leftText);
    const rightInput = readInputText(rightFile, req.body.rightText);

    if (!leftInput.exists || !rightInput.exists) {
      res
        .status(400)
        .json(
          createEmptyResponse('text', filters, '请提供左侧和右侧文本，或上传两个文件。', {
            ...uploadedFiles
          })
        );
      return;
    }

    const detectionLeftText = leftInput.text ?? '';
    const detectionRightText = rightInput.text ?? '';
    const fileType = detectFileType({
      requestedFileType,
      leftFileName: uploadedFiles.leftFile,
      rightFileName: uploadedFiles.rightFile,
      leftText: detectionLeftText,
      rightText: detectionRightText
    });
    resolvedFileType = fileType;
    let diffResult;

    if (fileType === 'json') {
      diffResult = compareJsonText(
        await readInputAsText(leftInput),
        await readInputAsText(rightInput),
        normalizationOptions,
        advancedRuleOptions
      );
    } else if (fileType === 'csv') {
      diffResult = compareCsvText(
        await readInputAsText(leftInput),
        await readInputAsText(rightInput),
        normalizationOptions,
        advancedRuleOptions
      );
    } else if (fileType === 'excel') {
      const leftBuffer = await readInputAsBuffer(leftInput);
      const rightBuffer = await readInputAsBuffer(rightInput);

      if (!leftBuffer || !rightBuffer) {
        res
          .status(400)
          .json(createEmptyResponse('excel', filters, 'Excel 对比请上传左右两个 .xlsx 文件。'));
        return;
      }

      diffResult = await compareExcelBuffers(leftBuffer, rightBuffer, normalizationOptions, advancedRuleOptions);
    } else {
      diffResult = compareTextLines(
        await readInputAsText(leftInput),
        await readInputAsText(rightInput),
        filterOptions,
        advancedRuleOptions
      );
    }

    const advancedRules =
      'advancedRules' in diffResult ? diffResult.advancedRules : buildAdvancedRulesInfo(advancedRuleOptions);
    const normalization =
      'normalization' in diffResult ? diffResult.normalization : buildNormalizationInfo(normalizationOptions);

    const response: CompareResponse = {
      success: true,
      fileType,
      summary: diffResult.summary,
      result: diffResult.result,
      filters,
      advancedRules,
      normalization,
      performance: diffResult.performance,
      message:
        fileType === 'json'
          ? 'JSON 树形对比完成。'
          : fileType === 'csv'
            ? 'CSV 表格对比完成。'
            : fileType === 'excel'
              ? 'Excel 表格对比完成。'
              : '文本逐行对比完成。',
      received: {
        ...uploadedFiles,
        leftSource: leftInput.source,
        rightSource: rightInput.source,
        leftSize: leftInput.size,
        rightSize: rightInput.size,
        requestedFileType
      }
    };

    await persistPairCompareJob({
      durationMs: Date.now() - startedAt,
      fileType,
      leftDisplayName: getDisplayName(leftFile, '左侧文本输入'),
      leftFile,
      response,
      rightDisplayName: getDisplayName(rightFile, '右侧文本输入'),
      rightFile,
      userId: req.user?.id
    });

    res.json(response);
  } catch (error) {
    if (error instanceof SyntaxError) {
      const filters = buildFilterInfo(normalizeFilterOptions(req.body));

      res
        .status(400)
        .json(createEmptyResponse('json', filters, 'JSON 解析失败，请检查左右两侧 JSON 格式。'));
      return;
    }

    if (resolvedFileType === 'csv' || resolvedFileType === 'excel') {
      const filters = buildFilterInfo(normalizeFilterOptions(req.body));
      const message =
        resolvedFileType === 'csv'
          ? 'CSV 解析失败，请检查左右两侧 CSV 格式。'
          : 'Excel 解析失败，目前请上传 .xlsx 文件。';

      res.status(400).json(createEmptyResponse(resolvedFileType, filters, message));
      return;
    }

    next(error);
  } finally {
    await cleanupUploadedFiles(req);
  }
}

export async function compareVersionDiff(
  req: Request,
  res: Response<VersionChainResponse>,
  next: NextFunction
) {
  const startedAt = Date.now();
  let resolvedFileType: SupportedFileType = 'text';

  try {
    const filterOptions = normalizeFilterOptions(req.body);
    const filters = buildFilterInfo(filterOptions);
    const advancedRuleOptions = normalizeAdvancedRuleOptions(req.body);
    const normalizationOptions = normalizeNormalizationOptions(req.body);
    const requestedFileType = normalizeRequestedFileType(req.body.fileType);

    if (!requestedFileType) {
      res.status(400).json(
        emptyVersionChainResponse({
          fileType: 'text',
          filterInfo: filters,
          message: '当前仅支持 text、json、csv 和 excel 多版本对比。'
        })
      );
      return;
    }

    const files = getVersionFiles(req);

    if (files.length < 2) {
      res.status(400).json(
        emptyVersionChainResponse({
          fileType: 'text',
          filterInfo: filters,
          message: '多版本对比请至少上传两个版本文件。'
        })
      );
      return;
    }

    const firstBuffer = await fs.readFile(files[0].path);
    const secondBuffer = await fs.readFile(files[1].path);
    const fileType = detectFileType({
      requestedFileType,
      leftFileName: files[0].originalname,
      rightFileName: files[1].originalname,
      leftText: requestedFileType === 'auto' ? firstBuffer.toString('utf8') : '',
      rightText: requestedFileType === 'auto' ? secondBuffer.toString('utf8') : ''
    });
    resolvedFileType = fileType;

    const versions: VersionChainInput[] = await Promise.all(
      files.map(async (file, index) => {
        const buffer = index === 0 ? firstBuffer : index === 1 ? secondBuffer : await fs.readFile(file.path);

        return {
          buffer,
          fileName: file.originalname,
          label: file.originalname.replace(/\.[^.]+$/, '') || `v${index + 1}`,
          size: file.size,
          text: fileType === 'excel' ? undefined : buffer.toString('utf8')
        };
      })
    );

    const response = await compareVersionChain({
      advancedRuleOptions,
      fileType,
      filterInfo: filters,
      filterOptions,
      normalizationOptions,
      versions
    });

    const responseBody: VersionChainResponse = {
      ...response,
      received: {
        ...response.received,
        fileNames: files.map((file) => file.originalname),
        requestedFileType
      }
    };

    await persistVersionCompareJob({
      durationMs: Date.now() - startedAt,
      fileType,
      files,
      response: responseBody,
      userId: req.user?.id
    });

    res.json(responseBody);
  } catch (error) {
    const filters = buildFilterInfo(normalizeFilterOptions(req.body));

    if (error instanceof SyntaxError) {
      res.status(400).json(
        emptyVersionChainResponse({
          fileType: 'json',
          filterInfo: filters,
          message: 'JSON 多版本解析失败，请检查所有版本文件格式。'
        })
      );
      return;
    }

    if (resolvedFileType === 'csv' || resolvedFileType === 'excel') {
      const message =
        resolvedFileType === 'csv'
          ? 'CSV 多版本解析失败，请检查所有版本 CSV 格式。'
          : 'Excel 多版本解析失败，目前请上传 .xlsx 文件。';

      res.status(400).json(
        emptyVersionChainResponse({
          fileType: resolvedFileType,
          filterInfo: filters,
          message
        })
      );
      return;
    }

    next(error);
  } finally {
    await cleanupUploadedFiles(req);
  }
}
