from dotenv import load_dotenv
import uvicorn

load_dotenv()

from app_factory import create_app

app = create_app()


if __name__ == "__main__":
    uvicorn.run("main_simple:app", host="0.0.0.0", port=8001, reload=True)
