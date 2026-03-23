import { autocompleteApiFetch } from '../../config/api';
import type {
  BrandAutocompleteResponse,
  BrandContext,
  ModelConfig
} from '../../types/brandAutocomplete';

interface SuggestionRequestPayload {
  brandContext: BrandContext;
  currentText: string;
  sessionId: string;
  modelConfig: ModelConfig;
}

export async function requestSuggestions({
  brandContext,
  currentText,
  sessionId,
  modelConfig
}: SuggestionRequestPayload): Promise<BrandAutocompleteResponse> {
  const response = await autocompleteApiFetch('/api/suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brandName: brandContext.brandName,
      brandCategory: brandContext.brandCategory,
      brandIdentity: brandContext.brandIdentity ?? '',
      currentText,
      sessionId,
      modelConfig
    })
  });

  return response.json();
}
