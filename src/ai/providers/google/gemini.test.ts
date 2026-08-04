import { GeminiManager } from './gemini';
import { GoogleGenAI } from '@google/genai';

// Mock the @google/genai module
jest.mock('@google/genai');

describe('GeminiManager', () => {
  let manager: GeminiManager;
  let mockGenerateContent: jest.Mock;

  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.clearAllMocks();
    manager = new GeminiManager('test-api-key');

    mockGenerateContent = jest.fn().mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ text: 'test commit message' }],
          },
        },
      ],
    });

    (GoogleGenAI as jest.Mock).mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    }));
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should initialize GoogleGenAI with the correct API key', async () => {
    await (manager as any).makeRequest({
      messages: [{ content: 'test request' }],
    });

    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
  });

  it('should call generateContent with correct model and parameters', async () => {
    await (manager as any).makeRequest({
      messages: [{ content: 'test prompt' }],
    });

    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: 'test prompt' }] }],
      config: expect.any(Object),
    });
  });

  it('should extract text from parts correctly (bypassing text getter)', async () => {
    // Test the specific fix for bypassing the warning by extracting parts directly
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ text: 'part 1 ' }, { thoughtSignature: 'thought' }, { text: 'part 2' }],
          },
        },
      ],
      // We set text getter just to ensure we aren't using it
      get text() {
        return 'getter text';
      },
    });

    const result = await (manager as any).makeRequest({
      messages: [{ content: 'test request' }],
    });

    // Should concatenate the text parts, ignoring non-text parts and text getter
    expect(result.content).toBe('part 1 part 2');
  });

  it('should fallback to text getter when parts are not available', async () => {
    mockGenerateContent.mockResolvedValue({
      // No candidates or parts
      text: 'fallback text',
    });

    const result = await (manager as any).makeRequest({
      messages: [{ content: 'test request' }],
    });

    expect(result.content).toBe('fallback text');
  });

  it('should fallback to empty string when text getter and parts are not available', async () => {
    mockGenerateContent.mockResolvedValue(null);

    const result = await (manager as any).makeRequest({
      messages: [{ content: 'test request' }],
    });

    expect(result.content).toBe('');
  });

  it('should handle API errors properly', async () => {
    const testError = new Error('API error');
    mockGenerateContent.mockRejectedValue(testError);

    await expect(
      (manager as any).makeRequest({
        messages: [{ content: 'test request' }],
      })
    ).rejects.toThrow(testError);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Gemini API error:', 'API error');
  });

  it('should handle API errors that lack a message property', async () => {
    const stringError = 'String API error';
    mockGenerateContent.mockRejectedValue(stringError);

    await expect(
      (manager as any).makeRequest({
        messages: [{ content: 'test request' }],
      })
    ).rejects.toEqual(stringError); // Using toEqual instead of toThrow because it throws a string

    expect(consoleErrorSpy).toHaveBeenCalledWith('Gemini API error:', 'String API error');
  });
});
