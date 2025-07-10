import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface GeminiObjectiveGeneratorProps {
  userProfile: any;
  careerPathway: any;
  careerLevel: any;
  skillDescription: string;
  themeName: string;
  onGeneratedObjective: (objective: {
    smart_objective: string;
    specific: string;
    measurable: string;
    achievable: string;
    relevant: string;
    time_bound: string;
  }) => void;
}

const GeminiObjectiveGenerator: React.FC<GeminiObjectiveGeneratorProps> = ({
  userProfile,
  careerPathway,
  careerLevel,
  skillDescription,
  themeName,
  onGeneratedObjective
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const generateObjective = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Initialize the Gemini API with your API key
      const genAI = new GoogleGenerativeAI('AIzaSyDyXGjaqLNqCOSwmqwKzUJcNDkiA8ICRTw');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      // Prepare the prompt with user context
      const prompt = `
        Generate a SMART objective for professional development with the following context:
        
        USER PROFILE:
        - Name: ${userProfile.full_name || 'Not specified'}
        - Role: ${userProfile.role || 'Not specified'}
        - Department: ${userProfile.department || 'Not specified'}
        
        CAREER INFORMATION:
        - Career Pathway: ${careerPathway?.name || 'Not specified'}
        - Career Level: ${careerLevel?.name || 'Not specified'}
        
        SKILL TO DEVELOP:
        - Skill: ${skillDescription}
        - Theme: ${themeName}
        
        Please generate a complete SMART objective with the following components:
        1. Main SMART objective statement (concise, clear, actionable)
        2. Specific: What exactly will be accomplished?
        3. Measurable: How will progress and success be measured?
        4. Achievable: Why is this realistic given the person's role and level?
        5. Relevant: Why is this important for their career development?
        6. Time-bound: What is the timeframe for completion?
        
        Format your response as a JSON object with these keys:
        {
          "smart_objective": "...",
          "specific": "...",
          "measurable": "...",
          "achievable": "...",
          "relevant": "...",
          "time_bound": "..."
        }
      `;
      
      // Generate content
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract the JSON object from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse AI response");
      }
      
      const objective = JSON.parse(jsonMatch[0]);
      
      // Validate the response has all required fields
      const requiredFields = ['smart_objective', 'specific', 'measurable', 'achievable', 'relevant', 'time_bound'];
      const missingFields = requiredFields.filter(field => !objective[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`AI response missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Pass the generated objective to the parent component
      onGeneratedObjective(objective);
    } catch (err) {
      console.error('Error generating objective with Gemini:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate objective');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="mt-4">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-3">
          {error}
        </div>
      )}
      
      <button
        type="button"
        onClick={generateObjective}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Génération en cours...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Générer avec Gemini
          </>
        )}
      </button>
      
      {loading && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          Gemini analyse votre profil et génère un objectif SMART personnalisé...
        </p>
      )}
    </div>
  );
};

export default GeminiObjectiveGenerator;