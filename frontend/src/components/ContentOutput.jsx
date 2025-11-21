import React from "react";

export default function ContentOutput({ caption, hashtags, image, language }) {
  if (!caption && !hashtags && !image) return null;

  const isUrdu = language === "urdu";

  return (
    <div className="mt-6 bg-gray-100 p-6 rounded-xl shadow-md">
      {caption && (
        <>
          <p className="font-semibold text-gray-800">Caption:</p>
          <p
            className={`mt-1 ${
              isUrdu ? "text-right font-noto text-lg" : "text-left"
            } text-gray-700`}
          >
            {caption}
          </p>
        </>
      )}

      {hashtags && (
        <>
          <p className="font-semibold text-gray-800 mt-4">Hashtags:</p>
          <p className="text-indigo-600 mt-1">{hashtags}</p>
        </>
      )}

      {image && (
        <>
          <p className="font-semibold text-gray-800 mt-4">Generated Image:</p>
          <img
            src={image}
            alt="Generated"
            className="rounded-lg shadow-md border mt-2"
          />
        </>
      )}
    </div>
  );
}