# c:\Users\Gonzalo\entrenador-ia\backend\scripts\test_search.py
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.intelligence import semantic_search_exercises

def test():
    query = "pecho con barra"
    print(f"Testing search for: {query}")
    res = semantic_search_exercises(query, limit=3)
    print("Results:")
    for i, doc in enumerate(res['documents'][0]):
        print(f"{i+1}. {doc} (ID: {res['ids'][0][i]})")

if __name__ == "__main__":
    test()
