const axios = require('axios');
const logger = require('../utils/logger');
const Summary = require('../models/Summary');

/**
 * AI Service - Handles OpenAI Whisper and GPT integration for meeting intelligence
 */

class AIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';

    if (!this.apiKey) {
      logger.warn('OpenAI API key not configured. AI features will be disabled.');
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   * @param {Buffer} audioBuffer - Audio file buffer
   * @returns {Promise<string>} - Transcribed text
   */
  async transcribeAudio(audioBuffer) {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const formData = new FormData();
      formData.append('file', new Blob([audioBuffer]), 'audio.mp3');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const response = await axios.post(
        `${this.baseURL}/audio/transcriptions`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      logger.info('Audio transcribed successfully');
      return response.data.text;
    } catch (error) {
      logger.error(`Transcription error: ${error.message}`);
      throw new Error('Failed to transcribe audio');
    }
  }

  /**
   * Generate meeting summary using GPT
   * @param {string} transcript - Meeting transcript
   * @returns {Promise<Object>} - Summary with key points and action items
   */
  async generateSummary(transcript) {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const prompt = `You are a professional meeting summarizer. Analyze the following meeting transcript and provide:
1. A concise summary (2-3 sentences)
2. Key points (3-5 bullet points)
3. Action items with assignees if mentioned
4. Overall sentiment

Transcript:
${transcript}

Please format your response as JSON with these keys: summary, keyPoints, actionItems, sentiment`;

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a professional meeting summarizer. Respond with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      const content = response.data.choices[0].message.content;
      const summaryData = JSON.parse(content);

      logger.info('Summary generated successfully');
      return summaryData;
    } catch (error) {
      logger.error(`Summary generation error: ${error.message}`);
      throw new Error('Failed to generate summary');
    }
  }

  /**
   * Extract action items and assignees from transcript
   * @param {string} transcript - Meeting transcript
   * @returns {Promise<Array>} - Array of action items with assignees
   */
  async extractActionItems(transcript) {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const prompt = `Extract action items from this meeting transcript. For each item, identify:
1. The task description
2. The assignee (if mentioned)
3. The deadline (if mentioned)

Transcript:
${transcript}

Return as JSON array with objects containing: task, assignee, deadline`;

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an AI that extracts action items. Respond with valid JSON array.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.5,
          max_tokens: 800,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      const content = response.data.choices[0].message.content;
      const actionItems = JSON.parse(content);

      logger.info('Action items extracted');
      return Array.isArray(actionItems) ? actionItems : [actionItems];
    } catch (error) {
      logger.error(`Action item extraction error: ${error.message}`);
      throw new Error('Failed to extract action items');
    }
  }

  /**
   * Analyze sentiment of meeting transcript
   * @param {string} transcript - Meeting transcript
   * @returns {Promise<Object>} - Sentiment analysis
   */
  async analyzeSentiment(transcript) {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const prompt = `Analyze the sentiment of this meeting transcript. Provide:
1. Overall sentiment (positive, neutral, or negative)
2. Sentiment scores (0-1 for each: positive, neutral, negative)
3. Key emotional indicators

Transcript:
${transcript}

Return as JSON with keys: overall, scores, indicators`;

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a sentiment analyzer. Respond with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.5,
          max_tokens: 500,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      const content = response.data.choices[0].message.content;
      const sentimentData = JSON.parse(content);

      logger.info('Sentiment analysis completed');
      return sentimentData;
    } catch (error) {
      logger.error(`Sentiment analysis error: ${error.message}`);
      throw new Error('Failed to analyze sentiment');
    }
  }

  /**
   * Generate comprehensive meeting report
   * @param {Object} meetingData - Meeting object with transcript
   * @returns {Promise<Object>} - Complete meeting summary and analysis
   */
  async generateMeetingReport(meetingData) {
    try {
      if (!this.apiKey) {
        logger.warn('OpenAI API not configured. Returning basic report.');
        return {
          summary: 'Meeting report generation disabled',
          keyPoints: [],
          actionItems: [],
          sentiment: { overall: 'neutral' },
        };
      }

      const { transcript, title } = meetingData;

      if (!transcript) {
        throw new Error('Meeting transcript is required');
      }

      // Run all analyses in parallel
      const [summaryData, actionItems, sentimentData] = await Promise.all([
        this.generateSummary(transcript),
        this.extractActionItems(transcript),
        this.analyzeSentiment(transcript),
      ]);

      logger.info(`Meeting report generated for: ${title}`);

      return {
        summary: summaryData.summary,
        keyPoints: summaryData.keyPoints || [],
        actionItems,
        sentiment: sentimentData,
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error(`Report generation error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new AIService();
