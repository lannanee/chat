import { uploadImageFromBuffer } from "../middlewares/uploadMiddleware.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import Session from "../models/Session.js";

export const authMe = async (req, res) => {
  try {
    const user = req.user; // lấy từ authMiddleware

    return res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("Lỗi khi gọi authMe", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const searchUserByUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || username.trim() === "") {
      return res.status(400).json({ message: "Cần cung cấp username trong query." });
    }

    const user = await User.findOne({ username }).select(
      "_id displayName username avatarUrl"
    );

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Lỗi xảy ra khi searchUserByUsername", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    const file = req.file;
    const userId = req.user._id;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await uploadImageFromBuffer(file.buffer);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        avatarUrl: result.secure_url,
        avatarId: result.public_id,
      },
      {
        new: true,
      }
    ).select("avatarUrl");

    if (!updatedUser.avatarUrl) {
      return res.status(400).json({ message: "Avatar trả về null" });
    }

    return res.status(200).json({ avatarUrl: updatedUser.avatarUrl });
  } catch (error) {
    console.error("Lỗi xảy ra khi upload avatar", error);
    return res.status(500).json({ message: "Upload failed" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { displayName, bio, phone, email } = req.body;

    // Validate inputs
    if (!displayName || displayName.trim() === "") {
      return res.status(400).json({ message: "Tên hiển thị không thể trống" });
    }

    // Check if email is already in use by another user
    if (email) {
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        return res.status(409).json({ message: "Email đã được sử dụng" });
      }
    }

    const updateData = {
      displayName: displayName.trim(),
    };

    if (bio !== undefined) {
      updateData.bio = bio ? bio.trim().substring(0, 500) : "";
    }

    if (phone !== undefined) {
      updateData.phone = phone ? phone.trim() : "";
    }

    if (email !== undefined) {
      updateData.email = email ? email.toLowerCase().trim() : undefined;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-hashedPassword");

    return res.status(200).json({ 
      message: "Cập nhật thông tin thành công",
      user: updatedUser 
    });
  } catch (error) {
    console.error("Lỗi xảy ra khi updateProfile", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        message: "Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới" 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        message: "Mật khẩu mới không khớp" 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: "Mật khẩu mới phải có ít nhất 6 ký tự" 
      });
    }

    // Get user with password
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Verify current password
    const passwordCorrect = await bcrypt.compare(currentPassword, user.hashedPassword);
    
    if (!passwordCorrect) {
      return res.status(401).json({ 
        message: "Mật khẩu hiện tại không chính xác" 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await User.findByIdAndUpdate(
      userId,
      { hashedPassword },
      { new: true }
    );

    // Delete all sessions to force re-login
    await Session.deleteMany({ userId });

    return res.status(200).json({ 
      message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." 
    });
  } catch (error) {
    console.error("Lỗi xảy ra khi changePassword", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ 
        message: "Vui lòng nhập mật khẩu để xác nhận xoá tài khoản" 
      });
    }

    // Get user with password
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Verify password
    const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);
    
    if (!passwordCorrect) {
      return res.status(401).json({ 
        message: "Mật khẩu không chính xác" 
      });
    }

    // Delete user account
    await User.findByIdAndDelete(userId);
    
    // Delete all sessions
    await Session.deleteMany({ userId });

    // Clear refresh token cookie
    res.clearCookie("refreshToken");

    return res.status(200).json({ 
      message: "Tài khoản đã được xoá thành công" 
    });
  } catch (error) {
    console.error("Lỗi xảy ra khi deleteAccount", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

