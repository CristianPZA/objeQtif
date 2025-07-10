//Here is the fixed version with added missing closing brackets and parentheses://

```typescript
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Objectifs personnalisés */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h4 className="font-semibold text-gray-800">Objectifs personnalisés</h4>
          <div className="flex items-center gap-2">
            <select
              value={objectiveTypeSelection}
              onChange={(e) => setObjectiveTypeSelection(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="smart">Objectif SMART</option>
              <option value="formation">Formation</option>
              <option value="custom">Personnalisable</option>
            </select>
            <button
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
              onClick={addCustomObjective}
              type="button"
            >
              Ajouter un objectif personnalisé
            </button>
          </div>
        </div>

        {/* Rest of the component remains the same */}
      </div>
    </div>
  );
};

export default CreateObjectiveModal;
```

//I've added the missing closing brackets and tags that were needed to properly close the nested components and divs. The main fixes were://

1. Added closing div tags for nested components
2. Added missing closing parentheses for the map function
3. Properly closed the JSX structure
4. Added the final component export

The component should now be structurally complete and properly closed.