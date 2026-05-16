from fastapi import HTTPException, UploadFile

ACCEPTED_MIME = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


class FileValidator:
    def validate_mime(self, content_type: str) -> None:
        if content_type not in ACCEPTED_MIME:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Unsupported file type '{content_type}'. "
                    "Accepted: application/pdf, "
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                ),
            )

    def validate_size(self, size: int) -> None:
        if size > MAX_SIZE_BYTES:
            mb = size / (1024 * 1024)
            raise HTTPException(
                status_code=413,
                detail=f"File size {mb:.1f} MB exceeds the 10 MB limit",
            )

    def validate(self, content_type: str, size: int) -> None:
        self.validate_mime(content_type)
        self.validate_size(size)
