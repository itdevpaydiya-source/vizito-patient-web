# IndicTrans2 (AI4Bharat) inference on CPU, following the repo's huggingface_interface example.
FROM python:3.10
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir torch==2.4.1 --extra-index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir "transformers==4.46.3" sentencepiece sacremoses "IndicTransToolkit==1.1.1"
WORKDIR /work
