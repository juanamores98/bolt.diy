import { BaseProvider } from '../base-provider';
import type { ModelInfo, ProviderConfig } from '../types';
import type { LanguageModelV1 } from 'ai';
import type { IProviderSetting } from '~/types/model';

class VSCodeLMProvider extends BaseProvider {
  name = 'vscode-lm';
  staticModels: ModelInfo[] = [];
  config: ProviderConfig = {
    baseUrlKey: 'VSCODE_LM_BASE_URL',
    apiTokenKey: 'VSCODE_LM_API_KEY',
  };

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ): Promise<ModelInfo[]> {
    const { baseUrl } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv,
      defaultBaseUrlKey: 'VSCODE_LM_BASE_URL',
      defaultApiTokenKey: 'VSCODE_LM_API_KEY',
    });

    if (!baseUrl) {
      throw new Error('Base URL for VSCodeLMProvider is not set');
    }

    try {
      const response = await fetch(`${baseUrl}/vscode-lm/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }

      return data.map((model: any) => ({
        name: model.id,
        label: model.name,
        provider: this.name,
        maxTokenAllowed: model.contextWindow,
      }));
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  }

  getModelInstance(options: {
    model: string;
    serverEnv?: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: IProviderSetting;
  }): LanguageModelV1 {
    const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys: options.apiKeys,
      providerSettings: options.providerSettings,
      serverEnv: options.serverEnv,
      defaultBaseUrlKey: 'VSCODE_LM_BASE_URL',
      defaultApiTokenKey: 'VSCODE_LM_API_KEY',
    });

    if (!baseUrl) {
      throw new Error('Base URL for VSCodeLMProvider is not set');
    }

    return {
      async chat(messages) {
        try {
          const response = await fetch(`${baseUrl}/vscode-lm/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: options.model,
              messages,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to send chat request: ${response.statusText}`);
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let result = '';

          while (true) {
            const { done, value } = await reader?.read() || { done: true, value: undefined };

            if (done) break;

            result += decoder.decode(value, { stream: true });
          }

          return result;
        } catch (error) {
          console.error('Error during chat interaction:', error);
          throw error;
        }
      },
    };
  }
}

export default VSCodeLMProvider;
