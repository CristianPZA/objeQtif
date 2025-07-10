@@ .. @@
 import React from 'react';
 import { Save } from 'lucide-react';
+import GeminiObjectiveGenerator from './GeminiObjectiveGenerator';

@@ .. @@
                   placeholder="Quelle est l'échéance pour atteindre cet objectif ?"
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                 />
+                
+                {/* Gemini AI Generator */}
+                <GeminiObjectiveGenerator
+                  userProfile={collaboration.employe || {}}
+                  careerPathway={null}
+                  careerLevel={null}
+                  skillDescription={objective.skill_description}
+                  themeName={objective.theme_name}
+                  onGeneratedObjective={(generatedObjective) => {
+                    onUpdateObjective(index, 'smart_objective', generatedObjective.smart_objective);
+                    onUpdateObjective(index, 'specific', generatedObjective.specific);
+                    onUpdateObjective(index, 'measurable', generatedObjective.measurable);
+                    onUpdateObjective(index, 'achievable', generatedObjective.achievable);
+                    onUpdateObjective(index, 'relevant', generatedObjective.relevant);
+                    onUpdateObjective(index, 'time_bound', generatedObjective.time_bound);
+                  }}
+                />
               </div>
             </div>
           ))}